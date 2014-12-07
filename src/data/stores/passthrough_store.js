BetaJS.Stores.BaseStore.extend("BetaJS.Stores.PassthroughStore", {
	
	constructor: function (store, options) {
		this.__store = store;
		options = options || {};
		options.id_key = store.id_key();
		this._projection = options.projection || {};
		this._inherited(BetaJS.Stores.PassthroughStore, "constructor", options);
        if (options.destroy_store)
            this._auto_destroy(store);
	},
	
	_query_capabilities: function () {
		return this.__store._query_capabilities();
	},

	_insert: function (data) {
		return this.__store.insert(BetaJS.Objs.extend(data, this._projection));
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
		return this.__store.query(BetaJS.Objs.extend(query, this._projection), options);
	},
	
	_ensure_index: function (key) {
		return this.__store.ensure_index(key);
	},
	
	_store: function () {
		return this.__store;
	}

});



BetaJS.Stores.PassthroughStore.extend("BetaJS.Stores.ActiveStore", {
	
	constructor: function (store, listener, options) {
		this._inherited(BetaJS.Stores.ActiveStore, "constructor", store, options);
		this.__listener = listener;
		this.delegateEvents(null, listener);
	}
	
});
