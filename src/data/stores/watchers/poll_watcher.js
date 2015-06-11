Scoped.define("module:Stores.Watchers.PollWatcher", [
                                                     "module:Stores.Watchers.StoreWatcher",
                                                     "base:Comparators",
                                                     "base:Objs"
                                                     ], function(StoreWatcher, Comparators, Objs, scoped) {
	return StoreWatcher.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (store, options) {
				options = options || {};
				options.id_key = store.id_key();
				inherited.constructor.call(this, options);
				this._store = store;
				options = options || {};
				this.__itemCache = {};
				this.__lastKey = null;
				this.__insertsCount = 0;
				this.__increasingKey = options.increasing_key || this.id_key;
			},

			_watchItem : function(id) {
				this.__itemCache[id] = null;
			},

			_unwatchItem : function(id) {
				delete this.__itemCache[id];
			},

			_queryLastKey: function () {
				var sort = {};
				return this._store.query({}, {
					limit: 1,
					sort: Objs.objectBy(this.__increasingKey, -1)
				}).mapSuccess(function (iter) {
					return iter.hasNext() ? iter.next()[this.__increasingKey] : null;
				}).mapError(function () {
					return null;
				});
			},

			_watchInsert : function(query) {
				if (this.__insertsCount === 0) {
					this._queryLastKey().success(function (value) {
						this.__lastKey = value;
					}, this);
				}
				this.__insertsCount++;
			},

			_unwatchInsert : function(query) {
				this.__insertsCount--;
				if (this.__insertsCount === 0)
					this.__lastKey = null;
			},

			poll: function () {
				Objs.iter(this.__itemCache, function (value, id) {
					this._store.get(id).success(function (data) {
						if (!data)
							this._removedItem(id);
						else {
							this.__itemCache[id] = Objs.clone(data, 1);
							if (value && !Comparators.deepEqual(value, data, -1))
								this._updatedItem(data, data);
						}
					}, this).error(function () {
						this._removedItem(id);
					}, this);
				}, this);
				if (this.__lastKey !== null) {
					this.insertsIterator().iterate(function (query) {
						var keyQuery = Objs.objectBy(this.__increasingKey, {"$gt": this.__lastKey});
						this._store.query({"$and": [keyQuery, query]}).success(function (result) {
							while (result.hasNext())
								this._insertedInsert(result.next());
						}, this);
					}, this);
				}
				this._queryLastKey().success(function (value) {
					this.__lastKey = value;
				}, this);
			}

		};
	});
});
