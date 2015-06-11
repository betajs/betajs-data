Scoped.define("module:Stores.Watchers.LocalWatcher", [
                                                      "module:Stores.Watchers.StoreWatcher"
                                                      ], function(StoreWatcher, scoped) {
	return StoreWatcher.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (store, options) {
				options = options || {};
				options.id_key = store.id_key();
				inherited.constructor.call(this, options);
				this._store = store;
				this._store.on("insert", function (data) {
					this._insertedInsert(data);
				}, this).on("update", function (row, data) {
					this._updatedItem(row, data);
				}, this).on("remove", function (id) {
					this._removedItem(id);
				}, this);
			},

			destroy: function () {
				this._store.off(null, null, this);
				inherited.destroy.apply(this);
			}

		};
	});
});
