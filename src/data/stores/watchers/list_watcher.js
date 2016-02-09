Scoped.define("module:Stores.Watchers.ListWatcher", [
    "module:Stores.Watchers.StoreWatcher",
    "base:Objs"
], function(StoreWatcher, Objs, scoped) {
	return StoreWatcher.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (store, watchers, options) {
				options = options || {};
				options.id_key = store.id_key();
				this.__watchers = watchers;
				inherited.constructor.call(this, options);
				this.__forEachWatcher(function (watcher) {
					this.delegateEvents(["insert", "update", "remove"], watcher);
				});
			},
			
			__forEachWatcher: function (f) {
				Objs.iter(this.__watchers, f, this);
			},

			destroy: function () {
				this.__forEachWatcher(function (watcher) {
					watcher.off(null, null, this);
				});
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
