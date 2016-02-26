Scoped.define("module:Stores.PartialStore", [
                                            "module:Stores.BaseStore",
                                            "module:Stores.CachedStore",
                                            "module:Stores.PartialStoreWriteStrategies.PostWriteStrategy",
                                            "module:Stores.PartialStoreWatcher",
                                            "base:Objs"
                                            ], function (Store, CachedStore, PostWriteStrategy, PartialStoreWatcher, Objs, scoped) {
	return Store.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (remoteStore, options) {
				inherited.constructor.call(this, options);
				this._options = Objs.extend({}, options);
				if (this._options.remoteWatcher)
					this.remoteWatcher = this._options.remoteWatcher;
				this.remoteStore = remoteStore;
				this.cachedStore = new CachedStore(remoteStore, this._options);
				this.writeStrategy = this._options.writeStrategy || this.auto_destroy(new PostWriteStrategy());
				if (this.remoteWatcher) {
					this.remoteWatcher.on("insert", this._remoteInsert, this);
					this.remoteWatcher.on("update", this._remoteUpdate, this);
					this.remoteWatcher.on("remove", this._remoteRemove, this);
					this._watcher = new PartialStoreWatcher(this);
				}
				this.cachedStore.on("insert", this._inserted, this);
				this.cachedStore.on("remove", this._removed, this);
				this.cachedStore.on("update", this._updated, this);
				this.writeStrategy.init(this);
			},
			
			id_key: function () {
				return this.cachedStore.id_key();
			},
			
			destroy: function () {
				if (this.remoteWatcher)
					this.remoteWatcher.off(null, null, this);
				if (this._watcher)
					this._watcher.destroy();
				this.cachedStore.destroy();
				inherited.destroy.call(this);
			},

			_insert: function (data) {
				return this.writeStrategy.insert(data);
			},
			
			_remove: function (id) {
				return this.writeStrategy.remove(id);
			},
			
			_update: function (id, data) {
				return this.writeStrategy.update(id, data);
			},

			_get: function (id) {
				return this.cachedStore.get(id);
			},
			
			_query: function (query, options) {
				return this.cachedStore.query(query, options);
			},			
			
			_query_capabilities: function () {
				return this.cachedStore._query_capabilities();
			},
			
			_remoteInsert: function (data) {
				this.cachedStore.cacheInsertUpdate(data, {
					lockItem: false,
					silent: false,
					refreshMeta: true,
					accessMeta: true,
					foreignKey: true
				});
			},
			
			_remoteUpdate: function (row, data) {
				var id = this.remoteStore.id_of(row);
				this.cachedStore.cacheUpdate(id, data, {
					ignoreLock: false,
					lockAttrs: false,
					silent: false,
					accessMeta: true,
					refreshMeta: true,
					foreignKey: true
				});
			},
			
			_remoteRemove: function (id) {
				this.cachedStore.cacheRemove(id, {
					ignoreLock: false,
					silent: false,
					foreignKey: true
				});
			}

		};
	});	
});


Scoped.define("module:Stores.PartialStoreWatcher", [
    "module:Stores.Watchers.LocalWatcher"                                                    
], function (StoreWatcher, scoped) {
	return StoreWatcher.extend({scoped: scoped}, function (inherited) {
		return {
			
			_watchItem : function(id) {
				inherited.watchItem.call(this, id);
				this._store.cachedStore.cachedIdToRemoteId(id).success(function (remoteId) {
					this._store.remoteWatcher.watchItem(remoteId, this);
				}, this);
			},

			_unwatchItem : function(id) {
				inherited.unwatchItem.call(this, id);
				this._store.cachedStore.cachedIdToRemoteId(id).success(function (remoteId) {
					this._store.remoteWatcher.unwatchItem(remoteId, this);
				}, this);
			},

			_watchInsert : function(query) {
				inherited.watchInsert.call(this, query);
				this._store.remoteWatcher.watchInsert(query, this);
			},

			_unwatchInsert : function(query) {
				inherited.unwatchInsert.call(this, query);
				this._store.remoteWatcher.unwatchInsert(query, this);
			}			
			
		};
	});
});