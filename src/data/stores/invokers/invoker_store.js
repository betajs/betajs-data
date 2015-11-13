Scoped.define("module:Stores.Invokers.StoreInvokee", [], function () {
	return {
		storeInvoke: function (member, data, context) {}
	};
});


Scoped.define("module:Stores.Invokers.RestInvokee", [], function () {
	return {
		restInvoke: function (method, uri, post, get, ctx) {}
	};
});


Scoped.define("module:Stores.Invokers.RouteredRestInvokee", [], function () {
	return {
		routeredRestInvoke: function (member, uriData, post, get, ctx) {}
	};
});



Scoped.define("module:Stores.Invokers.InvokerStore", ["module:Stores.BaseStore"], function (BaseStore, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {
			
			constructor: function (storeInvokee, options) {
				inherited.constructor.call(this, options);
				this.__storeInvokee = storeInvokee;
			},
			
			__invoke: function (member, data, context) {
				return this.__storeInvokee.storeInvoke(member, data, context);
			},

			_insert: function (data, ctx) {
				return this.__invoke("insert", data, ctx);
			},

			_remove: function (id, ctx) {
				return this.__invoke("remove", id, ctx);
			},

			_get: function (id, ctx) {
				return this.__invoke("get", id, ctx);
			},

			_update: function (id, data, ctx) {
				return this.__invoke("update", {
					id: id,
					data: data
				}, ctx);
			},

			_query: function (query, options, ctx) {
				return this.__invoke("query", {
					query: query,
					options: options
				}, ctx);
			}

		};
	});
});




Scoped.define("module:Stores.Invokers.StoreInvokeeInvoker", ["base:Class", "module:Stores.Invokers.StoreInvokee"], function (Class, Invokee, scoped) {
	return Class.extend({scoped: scoped}, [Invokee, function (inherited) {		
		return {
					
			constructor: function (store) {
				inherited.constructor.apply(this);
				this.__store = store;
			},
			
			storeInvoke: function (member, data, context) {
				return this["__" + member](data, context);
			},
			
			__insert: function (data, context) {
				return this.__store.insert(data, context);
			},
		
			__remove: function (id, context) {
				return this.__store.remove(id, context);
			},

			__get: function (id, context) {
				return this.__store.get(id, context);
			},

			__update: function (data, context) {
				return this.__store.update(data.id, data.data, context);
			},

			__query: function (data, context) {
				return this.__store.query(data.query, data.options, context);
			}

		};
	}]);
});