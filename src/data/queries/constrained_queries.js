Scoped.define("module:Queries.Constrained", [
        "json:",
        "module:Queries",
        "base:Types",
        "base:Objs",
        "base:Tokens",
        "base:Comparators"
	], function (JSON, Queries, Types, Objs, Tokens, Comparators) {
	return {
		
		/*
		 * 
		 * { query: query, options: options }
		 * 
		 * options:
		 * 	skip: int || 0
		 *  limit: int || null
		 *  sort: {
		 *    key1: 1 || -1,
		 *    key2: 1 || -1
		 *  }
		 * 
		 */
		
		rectify: function (constrainedQuery) {
			var base = ("options" in constrainedQuery || "query" in constrainedQuery) ? constrainedQuery : { query: constrainedQuery};
			return Objs.extend({
				query: {},
				options: {}
			}, base);
		},
		
		skipValidate: function (options, capabilities) {
			if ("skip" in options) {
				if (capabilities)
					return capabilities.skip;
			}
			return true;
		},
		
		limitValidate: function (options, capabilities) {
			if ("limit" in options) {
				if (capabilities)
					return capabilities.limit;
			}
			return true;
		},

		sortValidate: function (options, capabilities) {
			if ("sort" in options) {
				if (capabilities && !capabilities.sort)
					return false;
				if (capabilities && Types.is_object(capabilities.sort)) {
					var supported = Objs.all(options.sort, function (dummy, key) {
						return key in capabilities.sort;
					});
					if (!supported)
						return false;
				}
			}
			return true;
		},
		
		constraintsValidate: function (options, capabilities) {
			return Objs.all(["skip", "limit", "sort"], function (prop) {
				return this[prop + "Validate"].call(this, options, capabilities);
			}, this);
		},

		validate: function (constrainedQuery, capabilities) {
			constrainedQuery = this.rectify(constrainedQuery);
			return this.constraintsValidate(constrainedQuery.options, capabilities) && Queries.validate(constrainedQuery.query, capabilities.query || {});
		},
		
		fullConstrainedQueryCapabilities: function (queryCapabilties) {
			return {
				query: queryCapabilties,
				skip: true,
				limit: true,
				sort: true // can also be false OR a non-empty object containing keys which can be ordered by
			};
		},
		
		normalize: function (constrainedQuery) {
			constrainedQuery = this.rectify(constrainedQuery);
			return {
				query: Queries.normalize(constrainedQuery.query),
				options: constrainedQuery.options
			};
		},

		serialize: function (constrainedQuery) {
			return JSON.stringify(this.rectify(constrainedQuery));
		},
		
		unserialize: function (constrainedQuery) {
			return JSON.parse(constrainedQuery);
		},
		
		hash: function (constrainedQuery) {
			return Tokens.simple_hash(this.serialize(constrainedQuery));
		},
		
		subsumizes: function (constrainedQuery, constrainedQuery2) {
			constrainedQuery = this.rectify(constrainedQuery);
			constrainedQuery2 = this.rectify(constrainedQuery2);
			var qskip = constrainedQuery.options.skip || 0;
			var qskip2 = constrainedQuery2.options.skip || 0;
			var qlimit = constrainedQuery.options.limit || null;
			var qlimit2 = constrainedQuery2.options.limit || null;
			var qsort = constrainedQuery.options.sort;
			var qsort2 = constrainedQuery.options.sort;
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
			return Queries.subsumizes(constrainedQuery.query, constrainedQuery2.query);
		},
		
		mergeable: function (constrainedQuery, constrainedQuery2) {
			constrainedQuery = this.rectify(constrainedQuery);
			constrainedQuery2 = this.rectify(constrainedQuery2);
			if (Queries.serialize(constrainedQuery.query) != Queries.serialize(constrainedQuery2.query))
				return false;
			var qopts = constrainedQuery.options;
			var qopts2 = constrainedQuery2.options;
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
		
		merge: function (constrainedQuery, constrainedQuery2) {
			constrainedQuery = this.rectify(constrainedQuery);
			constrainedQuery2 = this.rectify(constrainedQuery2);
			var qopts = constrainedQuery.options;
			var qopts2 = constrainedQuery2.options;
			return {
				query: constrainedQuery.query,
				options: {
					skip: "skip" in qopts ? ("skip" in qopts2 ? Math.min(qopts.skip, qopts2.skip): null) : null,
					limit: "limit" in qopts ? ("limit" in qopts2 ? Math.max(qopts.limit, qopts2.limit): null) : null,
					sort: constrainedQuery.sort
				}
			};
		}
		
		
	}; 
});