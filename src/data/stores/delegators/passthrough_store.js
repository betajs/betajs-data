
Scoped.define("module:Stores.PassthroughStore", [
                                                 "module:Stores.BaseStore",
                                                 "base:Promise"
                                                 ], function (BaseStore, Promise, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (store, options) {
				this.__store = store;
				options = options || {};
				options.id_key = store.id_key();
				inherited.constructor.call(this, options);
				if (options.destroy_store)
					this._auto_destroy(store);
			},

			_query_capabilities: function () {
				return this.__store._query_capabilities();
			},

			_insert: function (data) {
				return this._preInsert(data).mapSuccess(function (data) {
					return this.__store.insert(data).mapSuccess(function (data) {
						return this._postInsert(data);
					}, this);
				}, this);
			},

			_remove: function (id) {
				return this._preRemove(id).mapSuccess(function (id) {
					return this.__store.remove(id).mapSuccess(function () {
						return this._postRemove(id);
					}, this);
				}, this);
			},

			_get: function (id) {
				return this._preGet(id).mapSuccess(function (id) {
					return this.__store.get(id).mapSuccess(function (data) {
						return this._postGet(data);
					}, this);
				}, this);
			},

			_update: function (id, data) {
				return this._preUpdate(id, data).mapSuccess(function (args) {
					return this.__store.update(args.id, args.data).mapSuccess(function (row) {
						return this._postUpdate(row);
					}, this);
				}, this);
			},

			_query: function (query, options) {
				return this._preQuery(query, options).mapSuccess(function (args) {
					return this.__store.query(args.query, args.options).mapSuccess(function (results) {
						return this._postQuery(results);
					}, this);
				}, this);
			},

			_ensure_index: function (key) {
				return this.__store.ensure_index(key);
			},

			_store: function () {
				return this.__store;
			},

			_preInsert: function (data) {
				return Promise.create(data);
			},
			
			_postInsert: function (data) {
				return Promise.create(data);
			},
			
			_preRemove: function (id) {
				return Promise.create(id);
			},
			
			_postRemove: function (id) {
				return Promise.create(true);
			},
			
			_preGet: function (id) {
				return Promise.create(id);
			},
			
			_postGet: function (data) {
				return Promise.create(data);
			},

			_preUpdate: function (id, data) {
				return Promise.create({id: id, data: data});
			},
			
			_postUpdate: function (row) {
				return Promise.create(row);
			},
			
			_preQuery: function (query, options) {
				return Promise.create({query: query, options: options});
			},
			
			_postQuery: function (results) {
				return Promise.create(results);
			}

		};
	});
});

