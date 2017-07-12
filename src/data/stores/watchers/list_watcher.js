Scoped.define("module:Stores.Watchers.ListWatcher", [
    "module:Stores.Watchers.StoreWatcher",
    "base:Objs"
], function(StoreWatcher, Objs, scoped) {
	return StoreWatcher.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (store, watchers, options) {
				options = options || {};
				options.id_key = store.id_key();
				this.__watchers = {};
				inherited.constructor.call(this, options);
				if (watchers)
					watchers.forEach(this.addWatcher, this);
			},

			addWatcher: function (watcher) {
				if (!this.__watchers[watcher.cid()]) {
					this.delegateEvents(["insert", "update", "remove"], watcher);
					this.itemsIterator().iterate(watcher.watchItem, watcher);
					this.insertsIterator().iterate(watcher.watchInsert, watcher);
                    this.__watchers[watcher.cid()] = watcher;
                }
                return this;
			},

            removeWatcher: function (watcher) {
                if (this.__watchers[watcher.cid()]) {
					watcher.off(null, null, this);
					this.itemsIterator().iterate(watcher.unwatchItem, watcher);
					this.insertsIterator().iterate(watcher.unwatchInsert, watcher);
                    delete this.__watchers[watcher.cid()];
                }
                return this;
            },

			__forEachWatcher: function (f, ctx) {
				Objs.iter(this.__watchers, f, ctx || this);
			},

			destroy: function () {
				this.__forEachWatcher(this.removeWatcher);
				inherited.destroy.apply(this);
			},
			
			_watchItem : function(id) {
				this.__forEachWatcher(function (watcher) {
					watcher.watchItem(id);
				});
			},

			_unwatchItem : function(id) {
				this.__forEachWatcher(function (watcher) {
					watcher.unwatchItem(id);
				});
			},

			_watchInsert : function(query) {
				this.__forEachWatcher(function (watcher) {
					watcher.watchInsert(query);
				});
			},

			_unwatchInsert : function(query) {
				this.__forEachWatcher(function (watcher) {
					watcher.unwatchInsert(query);
				});
			}

		};
	});
});
