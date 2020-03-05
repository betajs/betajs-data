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
				this._store.on("insert", function (data, ctx) {
					this._insertedInsert(data, ctx);
				}, this).on("update", function (row, data, ctx, pre_data, transaction_id) {
					this._updatedItem(row, data, ctx, transaction_id);
				}, this).on("remove", function (id, ctx) {
					this._removedItem(id, ctx);
				}, this);
			},

			destroy: function () {
				this._store.off(null, null, this);
				inherited.destroy.apply(this);
			}

		};
	});
});
