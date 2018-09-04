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



Scoped.define("module:Stores.Invokers.AbstractInvokerStore", [
    "module:Stores.BaseStore",
    "module:Queries.Constrained"
], function (BaseStore, Constrained, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {
			
			_query_capabilities: function () {
				return Constrained.fullConstrainedQueryCapabilities();
			},
			
			_invoke: function (member, data, context) {
				throw "Abstract method invoke";
			},

			_insert: function (data, ctx) {
				return this._invoke("insert", data, ctx);
			},

			_remove: function (id, ctx) {
				return this._invoke("remove", id, ctx);
			},

			_get: function (id, ctx) {
				return this._invoke("get", id, ctx);
			},

			_update: function (id, data, ctx) {
				return this._invoke("update", {
					id: id,
					data: data
				}, ctx);
			},

			_query: function (query, options, ctx) {
				return this._invoke("query", {
					query: query,
					options: options
				}, ctx);
			}

		};
	});
});



Scoped.define("module:Stores.Invokers.InvokerStore", [
    "module:Stores.Invokers.AbstractInvokerStore"
], function (AbstractInvokerStore, scoped) {
    return AbstractInvokerStore.extend({scoped: scoped}, function (inherited) {
        return {

            constructor: function (storeInvokee, options) {
                inherited.constructor.call(this, options);
                this.__storeInvokee = storeInvokee;
            },

            _invoke: function (member, data, context) {
                return this.__storeInvokee.storeInvoke(member, data, context);
            }

        };
    });
});





Scoped.define("module:Stores.Invokers.StoreInvokeeInvoker", [
	"base:Class",
	"module:Stores.Invokers.StoreInvokee"
], function (Class, Invokee, scoped) {
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
				return this.__store.query(data.query, data.options, context).mapSuccess(function (iter) {
					var result = iter.asArray();
					iter.decreaseRef();
					return result;
				});
			}

		};
	}]);
});