Scoped.define("module:Queries.Constrained", [
        "json:",
        "module:Queries",
        "base:Types",
        "base:Comparators",
        "base:Iterators.ArrayIterator",
        "base:Iterators.FilteredIterator",
        "base:Iterators.SortedIterator",
        "base:Iterators.SkipIterator",
        "base:Iterators.LimitIterator"
	], function (JSON, Queries, Types, Comparators, ArrayIterator, FilteredIterator, SortedIterator, SkipIterator, LimitIterator) {
	return {		
		
		make: function (query, options) {
			return {
				query: query,
				options: options || {}
			};
		},
		
		is_constrained: function (query) {
			return query && (query.query || query.options);
		},
		
		format: function (instance) {
			var query = instance.query;
			instance.query = Queries.format(query);
			var result = JSON.stringify(instance);
			instance.query = query;
			return result;
		},
		
		normalize: function (constrained_query) {
			return {
				query: "query" in constrained_query ? Queries.normalize(constrained_query.query) : {},
				options: {
					skip: "options" in constrained_query && "skip" in constrained_query.options ? constrained_query.options.skip : null,
					limit: "limit" in constrained_query && "limit" in constrained_query.options ? constrained_query.options.limit : null,
					sort: "sort" in constrained_query && "sort" in constrained_query.options ? constrained_query.options.sort : {}
				}
			};
		},
		
		emulate: function (constrained_query, query_capabilities, query_function, query_context) {
			var query = constrained_query.query || {};
			var options = constrained_query.options || {};
			var execute_query = {};
			var execute_options = {};
			if ("sort" in options && "sort" in query_capabilities)
				execute_options.sort = options.sort;
			execute_query = query;
			if ("query" in query_capabilities || Types.is_empty(query)) {
				execute_query = query;
				if (!options.sort || ("sort" in query_capabilities)) {
					if ("skip" in options && "skip" in query_capabilities)
						execute_options.skip = options.skip;
					if ("limit" in options && "limit" in query_capabilities) {
						execute_options.limit = options.limit;
						if ("skip" in options && !("skip" in query_capabilities))
							execute_options.limit += options.skip;
					}
				}
			}  
			return query_function.call(query_context || this, execute_query, execute_options).mapSuccess(function (raw) {
				var iter = raw;
				if (raw === null)
					iter = new ArrayIterator([]);
				else if (Types.is_array(raw))
					iter = new ArrayIterator(raw);		
				if (!("query" in query_capabilities || Types.is_empty(query)))
					iter = new FilteredIterator(iter, function(row) {
						return Queries.evaluate(query, row);
					});
				if ("sort" in options && !("sort" in execute_options))
					iter = new SortedIterator(iter, Comparators.byObject(options.sort));
				if ("skip" in options && !("skip" in execute_options))
					iter = new SkipIterator(iter, options.skip);
				if ("limit" in options && !("limit" in execute_options))
					iter = new LimitIterator(iter, options.limit);
				return iter;
			});
		},
		
		subsumizes: function (query, query2) {
			var qopt = query.options || {};
			var qopt2 = query2.options || {};
			var qskip = qopt.skip || 0;
			var qskip2 = qopt2.skip || 0;
			var qlimit = qopt.limit || null;
			var qlimit2 = qopt2.limit || null;
			var qsort = qopt.sort;
			var qsort2 = qopt2.sort;
			if (qskip > qskip2)
				return false;
			if (qlimit) {
				if (!qlimit2)
					return false;
				if (qlimit2 + qskip2 > qlimit + qskip)
					return false;
			}
			if ((qskip || qlimit) && (qsort || qsort2) && JSON.stringify(qsort) != JSON.stringify(qsort2))
				return false;
			return Queries.subsumizes(query.query, query2.query);
		},
		
		serialize: function (query) {
			return JSON.stringify(this.normalize(query));
		},
		
		unserialize: function (query) {
			return JSON.parse(query);
		},
		
		mergeable: function (query, query2) {
			if (Queries.serialize(query.query) != Queries.serialize(query2.query))
				return false;
			var qopts = query.options || {};
			var qopts2 = query2.options || {};
			if (JSON.stringify(qopts.sort || {}) != JSON.stringify(qopts2.sort || {}))
				return false;
			if ("skip" in qopts) {
				if ("skip" in qopts2) {
					if (qopts.skip <= qopts2.skip)
						return !qopts.limit || (qopts.skip + qopts.limit >= qopts2.skip);
					else
						return !qopts2.limit || (qopts2.skip + qopts2.limit >= qopts.skip);
				} else 
					return (!qopts2.limit || (qopts2.limit >= qopts.skip));
			} else 
				return !("skip" in qopts2) || (!qopts.limit || (qopts.limit >= qopts2.skip));
		},
		
		merge: function (query, query2) {
			var qopts = query.options || {};
			var qopts2 = query2.options || {};
			return {
				query: query.query,
				options: {
					skip: "skip" in qopts ? ("skip" in qopts2 ? Math.min(qopts.skip, qopts2.skip): null) : null,
					limit: "limit" in qopts ? ("limit" in qopts2 ? Math.max(qopts.limit, qopts2.limit): null) : null,
					sort: query.sort
				}
			};
		}
	
	}; 
});