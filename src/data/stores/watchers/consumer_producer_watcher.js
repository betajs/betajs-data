Scoped.define("module:Stores.Watchers.ConsumerWatcher", [
                                                         "module:Stores.Watchers.StoreWatcher"
                                                         ], function(StoreWatcher, scoped) {
	return StoreWatcher.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (sender, receiver, options) {
				inherited.constructor.call(this, options);
				this._receiver = receiver;
				this._sender = sender;
				receiver.on("receive", function (message, data) {
					if (message === "insert")
						this._insertedWatchedInsert(data);
					if (message === "update")
						this._updatedWatchedItem(data.row, data.data);
					else if (message === "remove")
						this._removedWatchedItem(data);
				}, this);
			},

			destroy: function () {
				this._receiver.off(null, null, this);
				inherited.destroy.apply(this);
			},

			_watchItem: function (id) {
				this._sender.send("watch_item", id);
			},

			_unwatchItem: function (id) {
				this._sender.send("unwatch_item", id);
			},

			_watchInsert: function (query) {
				this._sender.send("watch_insert", query);
			},

			_unwatchInsert: function (query) {
				this._sender.send("unwatch_insert", query);
			}

		};
	});
});


Scoped.define("module:Stores.Watchers.ProducerWatcher", [
                                                         "base:Class"
                                                         ], function(Class, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (sender, receiver, watcher) {
				inherited.constructor.apply(this);
				this._watcher = watcher;
				this._receiver = receiver;
				receiver.on("receive", function (message, data) {
					if (message === "watch_item")
						watcher.watchItem(data, this);
					else if (message === "unwatch_item")
						watcher.unwatchItem(data, this);
					else if (message === "watch_insert")
						watcher.watchInsert(data, this);
					else if (message === "unwatch_insert")
						watcher.unwatchInsert(data, this);
				}, this);
				watcher.on("insert", function (data) {
					sender.send("insert", data);
				}, this).on("update", function (row, data) {
					sender.send("update", {row: row, data: data});
				}, this).on("remove", function (id) {
					sender.send("remove", id);
				}, this);
			},

			destroy: function () {
				this._receiver.off(null, null, this);
				this._watcher.off(null, null, this);
				inherited.destroy.apply(this);
			}

		};
	});
});
