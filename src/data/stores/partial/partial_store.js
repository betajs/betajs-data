Scoped.define("module:Stores.PartialStore", [
                                            "module:Stores.BaseStore",
                                            "module:Stores.CachedStore",
                                            "module:Stores.PartialStoreWriteStrategies.PostWriteStrategy",
                                            "base:Objs"
                                            ], function (Store, CachedStore, PostWriteStrategy, Objs, scoped) {
	return Store.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (remoteStore, options) {
				inherited.constructor.call(this, options);
				this._options = Objs.extend({}, options);
				this.remoteStore = remoteStore;
				this.cachedStore = new CachedStore(remoteStore, this._options);
				this.writeStrategy = this._options.writeStrategy || this.auto_destroy(new PostWriteStrategy());
				if (this._watcher) {
					this._watcher.on("insert", this._remoteInsert, this);
					this._watcher.on("update", this._remoteUpdate, this);
					this._watcher.on("remove", this._remoteRemove, this);
				}
				this.cachedStore.on("insert", this._inserted, this);
				this.cachedStore.on("remove", this._removed, this);
				this.cachedStore.on("update", function (row, data) {
					this._updated(this.cachedStore.id_of(row), data);
				}, this);
			},
			
			destroy: function () {
				if (this._watcher)
					this._watcher.off(null, null, this);
				this.cachedStore.destroy();
				inherited.destroy.call(this);
			},

			_insert: function (data) {
				return this.writeStrategy.insert(this, data);
			},
			
			_remove: function (id) {
				return this.writeStrategy.remove(this, id);
			},
			
			_update: function (id, data) {
				return this.writeStrategy.update(this, id, data);
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
				this.cachedStore.cacheInsert(data, {
					lockItem: false,
					silent: false,
					refreshMeta: true,
					accessMeta: true
				});
			},
			
			_remoteUpdate: function (row, data) {
				var id = this.remoteStore.id_of(row);
				this.cachedStore.cacheUpdate(id, data, {
					ignoreLock: false,
					lockAttrs: false,
					silent: false,
					accessMeta: true,
					refreshMeta: true
				});
			},
			
			_remoteRemove: function (id) {
				this.cachedStore.cacheRemove(id, {
					ignoreLock: true,
					silent: false
				});
			}

		};
	});	
});