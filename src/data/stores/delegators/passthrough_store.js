
Scoped.define("module:Stores.PassthroughStore", [
                                                 "module:Stores.BaseStore",
                                                 "base:Objs"
                                                 ], function (BaseStore, Objs, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (store, options) {
				this.__store = store;
				options = options || {};
				options.id_key = store.id_key();
				this._projection = options.projection || {};
				inherited.constructor.call(this, options);
				if (options.destroy_store)
					this._auto_destroy(store);
			},

			_query_capabilities: function () {
				return this.__store._query_capabilities();
			},

			_insert: function (data) {
				return this.__store.insert(Objs.extend(data, this._projection));
			},

			_remove: function (id) {
				return this.__store.remove(id);
			},

			_get: function (id) {
				return this.__store.get(id);
			},

			_update: function (id, data) {
				return this.__store.update(id, data);
			},

			_query: function (query, options) {
				return this.__store.query(Objs.extend(query, this._projection), options);
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




Scoped.define("module:Stores.WriteDelegatorStore", [
                                                    "module:Stores.BaseStore"
                                                    ], function (BaseStore, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (writeStore, options) {
				inherited.constructor.call(this, options);
				this.writeStore = writeStore;
			},

			destroy: function () {
				this.writeStore.off(null, null, this);
				inherited.destroy.call(this);
			},

			_insert: function (data) {
				return this.writeStore.insert(data);
			},

			_remove: function (id) {
				return this.writeStore.remove(id);
			},

			_update: function (id, data) {
				return this.writeStore.update(id, data);
			},

			_ensure_index: function (key) {
				return this.writeStore.ensure_index(key);
			}

		};
	});
});


Scoped.define("module:Stores.ReadDelegatorStore", [
                                                   "module:Stores.BaseStore"
                                                   ], function (BaseStore, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (readStore, options) {
				inherited.constructor.call(this, options);
				this.readStore = readStore;
			},

			_query_capabilities: function () {
				return this.readStore._query_capabilities();
			},

			_get: function (id) {
				return this.readStore.get(id);
			},

			_query: function (query, options) {
				return this.readStore.query(Objs.extend(query, this._projection), options);
			}

		};
	});
});

