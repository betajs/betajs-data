Scoped.define("module:Queries.Engine", [
                                        "module:Queries",
                                        "module:Queries.Constrained",
                                        "base:Strings",
                                        "base:Types",
                                        "base:Objs",
                                        "base:Promise",
                                        "base:Comparators",
                                        "base:Iterators.SkipIterator",
                                        "base:Iterators.LimitIterator",
                                        "base:Iterators.SortedIterator",
                                        "base:Iterators.FilteredIterator",
                                        "base:Iterators.SortedOrIterator",
                                        "base:Iterators.PartiallySortedIterator",
                                        "base:Iterators.ArrayIterator",
                                        "base:Iterators.LazyMultiArrayIterator"
                                        ], function (Queries, Constrained, Strings, Types, Objs, Promise, Comparators, SkipIterator, LimitIterator, SortedIterator, FilteredIterator, SortedOrIterator, PartiallySortedIterator, ArrayIterator, LazyMultiArrayIterator) {
	return {

		indexQueryConditionsSize: function (conds, index, ignoreCase) {
			var add = ignoreCase ? "ic" : "";
			var postfix = ignoreCase ? "_ic" : "";
			var info = index.info();
			var subSize = info.row_count;
			var rows_per_key = info.row_count / Math.max(info["key_count" + postfix], 1);
			if (conds["$eq" + add])
				subSize = rows_per_key;
			else if (conds["$in" + add])
				subSize = rows_per_key * conds["$in" + add].length;
			else {
				var keys = 0;
				var g = null;
				if (conds["$gt" + add] || conds["$gte" + add]) {
					g = conds["$gt" + add] || conds["$gte" + add];
					if (conds["$gt" + add])
						keys--;
				}
				var l = null;
				if (conds["$lt" + add] || conds["$lte" + add]) {
					l = conds["$lt" + add] || conds["$lte" + add];
					if (conds["$lt" + add])
						keys--;
				}
				if (g !== null && l !== null)
					keys += index["key_count_distance" + postfix](g, l);						
				else if (g !== null)
					keys += index["key_count_right" + postfix](g);
				else if (l !== null)
					keys += index["key_count_left" + postfix](l);
				subSize = keys * rows_per_key;
			}
			return subSize;
		},

		indexQuerySize: function (queryDNF, key, index) {
			var acc = 0;
			var info = index.info();
			Objs.iter(queryDNF.$or, function (q) {
				if (!(key in q)) {
					acc = null;
					return false;
				}
				var conds = q[key];
				var findSize = info.row_count;
				if (index.options().exact)
					findSize = Math.min(findSize, this.indexQueryConditionsSize(conds, index, false));
				if (index.options().ignoreCase)
					findSize = Math.min(findSize, this.indexQueryConditionsSize(conds, index, true));
				acc += findSize;
			}, this);
			return acc;
		},

		queryPartially: function (constrainedQuery, constrainedQueryCapabilities) {
			var simplified = {
					query: constrainedQuery.query,
					options: {}
			};
			if (constrainedQuery.options.sort) {
				var first = Objs.ithKey(constrainedQuery.options.sort, 0);
				simplified.options.sort = {};
				simplified.options.sort[first] = constrainedQuery.options.sort[first];
			}
			return Constrained.validate(simplified, constrainedQueryCapabilities);
		},

		compileQuery: function (constrainedQuery, constrainedQueryCapabilities, constrainedQueryFunction, constrainedQueryContext) {
			constrainedQuery = Constrained.rectify(constrainedQuery);
			var sorting_supported = Constrained.sortValidate(constrainedQuery.options, constrainedQueryCapabilities);
			var query_supported = Queries.validate(constrainedQuery.query, constrainedQueryCapabilities.query || {});
			var skip_supported = Constrained.skipValidate(constrainedQuery.options, constrainedQueryCapabilities);
			var limit_supported = Constrained.limitValidate(constrainedQuery.options, constrainedQueryCapabilities);
			var post_actions = {
					skip: null,
					limit: null,
					filter: null,
					sort: null
			};
			if (!query_supported || !sorting_supported || !skip_supported) {
				post_actions.skip = constrainedQuery.options.skip;
				delete constrainedQuery.options.skip;
				if ("limit" in constrainedQuery.options && limit_supported && query_supported && sorting_supported)
					constrainedQuery.options.limit += post_actions.skip;
			}
			if (!query_supported || !sorting_supported || !limit_supported) {
				post_actions.limit = constrainedQuery.options.limit;
				delete constrainedQuery.options.limit;
			}
			if (!sorting_supported) {
				post_actions.sort = constrainedQuery.options.sort;
				delete constrainedQuery.options.sort;
			}
			if (!query_supported) {
				post_actions.filter = constrainedQuery.query;
				constrainedQuery.query = {};
			}
			var query_result = constrainedQueryFunction.call(constrainedQueryContext, constrainedQuery);
			return query_result.mapSuccess(function (iter) {
				iter = this._queryResultRectify(iter, false);
				if (post_actions.filter)
					iter = new FilteredIterator(iter, function(row) {
						return Queries.evaluate(post_actions.filter, row);
					});
				if (post_actions.sort)
					iter = new SortedIterator(iter, Comparators.byObject(post_actions.sort));
				if (post_actions.skip)
					iter = new SkipIterator(iter, post_actions.skip);
				if (post_actions.limit)
					iter = new LimitIterator(iter, post_actions.limit);
				return iter;
			}, this);
		},

		compileIndexQuery: function (constrainedDNFQuery, key, index) {
			var fullQuery = Objs.exists(constrainedDNFQuery.query.$or, function (query) {
				return !(key in query);
			});
			var primaryKeySort = constrainedDNFQuery.options.sort && Objs.ithKey(constrainedDNFQuery.options.sort, 0) === key;
			var primarySortDirection = primaryKeySort ? constrainedDNFQuery.options.sort[key] : 1;
			var iter;
			var ignoreCase = !index.options().exact;
			if (fullQuery) {
				var materialized = [];
				index["itemIterate" + (ignoreCase ? "_ic" : "")](null, primarySortDirection, function (dataKey, data) {
					materialized.push(data);
				});
				iter = new ArrayIterator(materialized);
			} else {
				iter = new SortedOrIterator(Objs.map(constrainedDNFQuery.query.$or, function (query) {
					var conds = query[key];
					if (!primaryKeySort && index.options().ignoreCase && index.options().exact) {
						if (this.indexQueryConditionsSize(conds, index, true) < this.indexQueryConditionsSize(conds, index, false))
							ignoreCase = true;
					}
					var add = ignoreCase ? "ic" : "";
					var postfix = ignoreCase ? "_ic" : "";
					if (conds["$eq" + add]) {
						var materialized = [];
						index["itemIterate" + postfix](conds["$eq" + add], primarySortDirection, function (dataKey, data) {
							if (dataKey !== conds["$eq" + add])
								return false;
							materialized.push(data);
						});
						iter = new ArrayIterator(materialized);
					} else if (conds["$in" + add]) {
						var i = 0;
						iter = new LazyMultiArrayIterator(function () {
							if (i >= conds["$in" + add].length)
								return null;
							var materialized = [];
							index["itemIterate" + postfix](conds["$in" + add][i], primarySortDirection, function (dataKey, data) {
								if (dataKey !== conds["in" + add][i])
									return false;
								materialized.push(data);
							});
							i++;
							return materialized;
						});
					} else {
						var currentKey = null;
						var lastKey = null;
						if (conds["$gt" + add] || conds["$gte" + add])
							currentKey = conds["$gt" + add] || conds["$gte" + add];
						if (conds["$lt" + add] || conds["$lte" + add])
							lastKey = conds["$lt" + add] || conds["$lte" + add];
						if (primarySortDirection < 0) {
							var temp = currentKey;
							currentKey = lastKey;
							lastKey = temp;
						}
						iter = new LazyMultiArrayIterator(function () {
							if (currentKey !== null && lastKey !== null) {
								if (Math.sign((index.comparator())(currentKey, lastKey)) === Math.sign(primarySortDirection))
									return null;
							}
							index["itemIterate" + postfix](currentKey, primarySortDirection, function (dataKey, data) {
								if (currentKey === null)
									currentKey = dataKey;
								if (dataKey !== currentKey) {
									currentKey = dataKey;
									return false;
								}
								materialized.push(data);
							});
							return materialized;
						});
					}
					return iter;
				}, this), index.comparator());
			}
			iter = new FilteredIterator(iter, function (row) {
				return Queries.evaluate(constrainedDNFQuery.query, row);
			});
			if (constrainedDNFQuery.options.sort) {
				if (primaryKeySort)
					iter = new PartiallySortedIterator(iter, Comparators.byObject(constrainedDNFQuery.options.sort), function (first, next) {
						return first[key] === next[key];
					});
				else
					iter = new SortedIterator(iter, Comparators.byObject(constrainedDNFQuery.options.sort));
			}
			if (constrainedDNFQuery.options.skip)
				iter = new SkipIterator(iter, constrainedDNFQuery.options.skip);
			if (constrainedDNFQuery.options.limit)
				iter = new LimitIterator(iter, constrainedDNFQuery.options.limit);
			return Promise.value(iter);
		},

		compileIndexedQuery: function (constrainedQuery, constrainedQueryCapabilities, constrainedQueryFunction, constrainedQueryContext, indices) {
			constrainedQuery = Constrained.rectify(constrainedQuery);
			indices = indices || {};
			if (this.queryPartially(constrainedQuery, constrainedQueryCapabilities) || Types.is_empty(indices))
				return this.compileQuery(constrainedQuery, constrainedQueryCapabilities, constrainedQueryFunction, constrainedQueryContext);
			if (constrainedQuery.options.sort) {
				var first = Objs.ithKey(constrainedQuery.options.sort, 0);
				if (indices[first]) {
					return this.compileIndexQuery({
						query: Queries.simplifyQuery(Queries.disjunctiveNormalForm(constrainedQuery.query, true)),
						options: constrainedQuery.options
					}, first, indices[first]);
				}
			}
			var dnf = Queries.simplifyQuery(Queries.disjunctiveNormalForm(constrainedQuery.query, true));
			var smallestSize = null;
			var smallestKey = null;
			Objs.iter(indices, function (index, key) {
				var size = this.indexQuerySize(dnf, key, index);
				if (size !== null && (smallestSize === null || size < smallestSize)) {
					smallestSize = size;
					smallestKey = key;
				}
			}, this);
			if (smallestKey !== null)
				return this.compileIndexQuery({
					query: dnf,
					options: constrainedQuery.options
				}, smallestKey, indices[smallestKey]);
			else
				return this.compileQuery(constrainedQuery, constrainedQueryCapabilities, constrainedQueryFunction, constrainedQueryContext);
		},

		_queryResultRectify: function (result, materialize) {
			result = result || [];
			return Types.is_array(result) == materialize ? result : (materialize ? result.asArray() : new ArrayIterator(result)); 
		}

	}; 
});


