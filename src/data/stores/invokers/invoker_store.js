Scoped.define("module:Stores.Invokers.StoreInvokee", [], function () {
	return {
		storeInvoke: function (member, data, context) {},
        storeInvokeWatcher: function (member, data, context) {}
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

            _invokeWatcher: function (member, data, context) {
                throw "Abstract method invokeWatcher";
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

			_update: function (id, data, ctx, transaction_id) {
				return this._invoke("update", {
					id: id,
					data: data,
					transaction_id: transaction_id
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


Scoped.define("module:Stores.Invokers.InvokerStoreWatcher", [
    "module:Stores.Watchers.LocalWatcher"
], function (LocalWatcher, scoped) {
	return LocalWatcher.extend({scoped: scoped}, {

        _watchItem : function(id) {
            this._store._invokeWatcher("watchItem", id);
		},

        _unwatchItem : function(id) {
            this._store._invokeWatcher("unwatchItem", id);
		},

        _watchInsert : function(query) {
            this._store._invokeWatcher("watchInsert", query);
		},

        _unwatchInsert : function(query) {
            this._store._invokeWatcher("unwatchInsert", query);
		}

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

			_store: function () {
				return this.__store;
			},
			
			storeInvoke: function (member, data, context) {
				return this["__" + member](data, context);
			},

            storeInvokeWatcher: function (member, data, context) {
                this["__" + member](data, context);
                return true;
			},

			__insert: function (data, context) {
				return this._store().insert(data, context);
			},
		
			__remove: function (id, context) {
				return this._store().remove(id, context);
			},

			__get: function (id, context) {
				return this._store().get(id, context);
			},

			__update: function (data, context) {
				return this._store().update(data.id, data.data, context, data.transaction_id);
			},

			__query: function (data, context) {
				return this._store().query(data.query, data.options, context).mapSuccess(function (iter) {
					var result = iter.asArray();
					iter.decreaseRef();
					return result;
				});
			},

            __watchItem: function (id, ctx) {
                if (this._store().watcher())
                    this._store().watcher().watchItem(id, ctx);
            },

            __unwatchItem: function (id, ctx) {
                if (this._store().watcher())
                    this._store().watcher().unwatchItem(id, ctx);
            },

            __watchInsert: function (query, ctx) {
                if (this._store().watcher())
                    this._store().watcher().watchInsert(query, ctx);
            },

            __unwatchInsert: function (query, ctx) {
                if (this._store().watcher())
                    this._store().watcher().unwatchInsert(query, ctx);
            }

		};
	}]);
});