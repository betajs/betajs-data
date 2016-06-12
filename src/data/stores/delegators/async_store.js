
Scoped.define("module:Stores.AsyncStore", [
                                                 "module:Stores.BaseStore",
                                                 "base:Promise",
                                                 "base:Async"
                                                 ], function (BaseStore, Promise, Async, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (store, options) {
				this.__store = store;
				options = options || {};
				options.id_key = store.id_key();
				inherited.constructor.call(this, options);
				this.__time = options.time || 0;
				if (options.destroy_store)
					this._auto_destroy(store);
			},

			_query_capabilities: function () {
				return this.__store._query_capabilities();
			},
			
			__async: function (f, args) {
				var promise = Promise.create();
				Async.eventually(function () {
					f.apply(this.__store, args).forwardCallback(promise);
				}, this, this.__time);
				return promise;
			},

			_insert: function () {
				return this.__async(this.__store.insert, arguments);
			},

			_remove: function () {
				return this.__async(this.__store.remove, arguments);
			},

			_get: function () {
				return this.__async(this.__store.get, arguments);
			},

			_update: function () {
				return this.__async(this.__store.update, arguments);
			},

			_query: function () {
				return this.__async(this.__store.query, arguments);
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

