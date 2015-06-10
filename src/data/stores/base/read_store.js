Scoped.define("module:Stores.ReadStoreMixin", [
                                               "module:Queries.Engine",
                                               "module:Stores.StoreException",                                               
                                               "base:Promise",
                                               "base:Objs"
                                               ], function (QueryEngine, StoreException, Promise, Objs) {
	return {

		_initializeReadStore: function (options) {
			options = options || {};
			this._query_model = "query_model" in options ? options.query_model : null;
			this.indices = {};
		},

		query_model: function () {
			if (arguments.length > 0)
				this._query_model = arguments[0];
			return this._query_model;
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
			if (this._query_model) {
				var subsumizer = this._query_model.subsumizer_of({query: query, options: options});
				if (!subsumizer) {
					this.trigger("query_miss", {query: query, options: options});
					return Promise.error(new StoreException("Cannot execute query"));
				}
				this.trigger("query_hit", {query: query, options: options}, subsumizer);
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

