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
		},
		
		watcher: function () {
			return this._watcher;
		},

		_get: function (id) {
			return Promise.create(null, new StoreException("unsupported: get"));
		},

		_query_capabilities: function () {
			return {};
		},

		_query: function (query, options) {
			return Promise.create(null, new StoreException("unsupported: query"));
		},

		get: function (id) {
			return this._get(id);
		},

		query: function (query, options) {
			query = Objs.clone(query, -1);
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
						return this._query(constrainedQuery.query, constrainedQuery.options);
					},
					this,
					this.indices);
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

