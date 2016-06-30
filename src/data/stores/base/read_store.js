Scoped.define("module:Stores.ReadStoreMixin", [
                                               "module:Queries.Engine",
                                               "module:Stores.StoreException",                                               
                                               "base:Promise",
                                               "base:Objs"
                                               ], function (QueryEngine, StoreException, Promise, Objs) {
	return {

		_initializeReadStore: function (options) {
			options = options || {};
			this.indices = {};
			this._watcher = options.watcher || null;
			this._capabilities = options.capabilities || {};
		},
		
		watcher: function () {
			return this._watcher;
		},

		_get: function (id, ctx) {
			return Promise.create(null, new StoreException("unsupported: get"));
		},

		_query_capabilities: function () {
			return this._capabilities;
		},

		_query: function (query, options, ctx) {
			return Promise.create(null, new StoreException("unsupported: query"));
		},

		get: function (id, ctx) {
			return this._get(id, ctx);
		},
		
		count: function (query, ctx) {
			return this._count(query, ctx);
		},
		
		_count: function (query, ctx) {
			return this.query(query, {}, ctx).mapSuccess(function (iter) {
				return iter.asArray().length;
			});
		},

		query: function (query, options, ctx) {
			query = Objs.clone(query || {}, -1);
			options = Objs.clone(options, -1);
			if (options) {
				if (options.limit)
					options.limit = parseInt(options.limit, 10);
				if (options.skip)
					options.skip = parseInt(options.skip, 10);
			}
			return QueryEngine.compileIndexedQuery(
					{query: query, options: options || {}},
					this._query_capabilities(),
					function (constrainedQuery) {
						return this._query(constrainedQuery.query, constrainedQuery.options, ctx);
					},
					this,
					this.indices);
		},
		
		serialize: function (ctx) {
			return this.query({}, {}, ctx).mapSuccess(function (iter) {
				return iter.asArray();
			});
		}

	};
});


Scoped.define("module:Stores.ReadStore", [
                                          "base:Class",
                                          "module:Stores.ReadStoreMixin"
                                          ], function (Class, ReadStoreMixin, scoped) {
	return Class.extend({scoped: scoped}, [ReadStoreMixin, function (inherited) {			
		return {

			constructor: function (options) {
				inherited.constructor.call(this);
				this._initializeReadStore(options);
			}

		};
	}]);
});

