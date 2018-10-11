
Scoped.define("module:Stores.PassthroughStore", [
                                                 "module:Stores.BaseStore",
                                                 "base:Promise"
                                                 ], function (BaseStore, Promise, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (store, options) {
				this.__store = store;
				options = options || {};
				options.id_key = options.id_key || store.id_key();
				this.__preserves = options.preserves;
				inherited.constructor.call(this, options);
				if (options.destroy_store)
					this._auto_destroy(store);
				this.delegateEvents(["insert", "update", "remove"], this.__store);
			},

			_query_capabilities: function () {
				return this.__store._query_capabilities();
			},

			_insert: function (originalData, ctx) {
				return this._preInsert(originalData).mapSuccess(function (data) {
					return this.__store.insert(data, ctx).mapSuccess(function (data) {
						var result = this._postInsert(data);
						if (this.__preserves) {
							return result.mapSuccess(function (data) {
								this.__preserves.forEach(function (preserve) {
									if (preserve in originalData && !(preserve in data))
										data[preserve] = originalData[preserve];
								});
								return data;
							}, this);
						} else
							return result;
					}, this);
				}, this);
			},

			_remove: function (id, ctx) {
				return this._preRemove(id).mapSuccess(function (id) {
					return this.__store.remove(id, ctx).mapSuccess(function () {
						return this._postRemove(id);
					}, this);
				}, this);
			},

			_get: function (id, ctx) {
				return this._preGet(id).mapSuccess(function (id) {
					return this.__store.get(id, ctx).mapSuccess(function (data) {
						return this._postGet(data);
					}, this);
				}, this);
			},

			_update: function (id, data, ctx, transaction_id) {
				return this._preUpdate(id, data).mapSuccess(function (args) {
					return this.__store.update(args.id, args.data, ctx, transaction_id).mapSuccess(function (row) {
						return this._postUpdate(row);
					}, this);
				}, this);
			},

			_query: function (query, options, ctx) {
				return this._preQuery(query, options).mapSuccess(function (args) {
					return this.__store.query(args.query, args.options, ctx).mapSuccess(function (results) {
						return this._postQuery(results);
					}, this);
				}, this);
			},

			unserialize: function (data) {
				return this._preUnserialize(data).mapSuccess(function (data) {
					return this.__store.unserialize(data).mapSuccess(function (data) {
						return this._postUnserialize(data);
					}, this);
				}, this);
			},

			serialize: function (data) {
				return this._preSerialize(data).mapSuccess(function (data) {
					return this.__store.serialize(data).mapSuccess(function (data) {
						return this._postSerialize(data);
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
				return Promise.value(data);
			},
			
			_postInsert: function (data) {
				return Promise.value(data);
			},
			
			_preRemove: function (id) {
				return Promise.value(id);
			},
			
			_postRemove: function (id) {
				return Promise.value(true);
			},
			
			_preGet: function (id) {
				return Promise.value(id);
			},
			
			_postGet: function (data) {
				return Promise.value(data);
			},

			_preUpdate: function (id, data) {
				return Promise.value({id: id, data: data});
			},
			
			_postUpdate: function (row) {
				return Promise.value(row);
			},
			
			_preQuery: function (query, options) {
				return Promise.value({query: query, options: options});
			},
			
			_postQuery: function (results) {
				return Promise.value(results);
			},
			
			_preSerialize: function (data) {
				return Promise.value(data);
			},
			
			_postSerialize: function (data) {
				return Promise.value(data);
			},
			
			_preUnserialize: function (data) {
				return Promise.value(data);
			},
			
			_postUnserialize: function (data) {
				return Promise.value(data);
			},
			
			watcher: function () {
				return this.__store.watcher();
			}

		};
	});
});

