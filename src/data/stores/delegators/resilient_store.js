
Scoped.define("module:Stores.ResilientStore", [
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
				this._resilience = options.resilience || 10;
				if (options.destroy_store)
					this._auto_destroy(store);
			},

			_query_capabilities: function () {
				return this.__store._query_capabilities();
			},

			_insert: function () {
				return Promise.resilientCall(this._store.insert, this._store, this._resilience, arguments);
			},

			_remove: function () {
				return Promise.resilientCall(this._store.remove, this._store, this._resilience, arguments);
			},

			_get: function () {
				return Promise.resilientCall(this._store.get, this._store, this._resilience, arguments);
			},

			_update: function (id, data) {
				return Promise.resilientCall(this._store.update, this._store, this._resilience, arguments);
			},

			_query: function (query, options) {
				return Promise.resilientCall(this._store.update, this._store, this._resilience, arguments);
			},

			_ensure_index: function (key) {
				return this.__store.ensure_index(key);
			},

			_store: function () {
				return this.__store;
			}

		};
	});
});

