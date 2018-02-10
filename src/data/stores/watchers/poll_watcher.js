Scoped.define("module:Stores.Watchers.PollWatcher", [
                                                     "module:Stores.Watchers.StoreWatcher",
                                                     "base:Comparators",
                                                     "base:Objs",
                                                     "base:Timers.Timer"
                                                     ], function(StoreWatcher, Comparators, Objs, Timer, scoped) {
	return StoreWatcher.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (store, options) {
				options = options || {};
				options.id_key = store.id_key();
				inherited.constructor.call(this, options);
				this._store = store;
				this.__itemCache = {};
				this.__lastKey = null;
				this.__lastKeyIds = {};
				this.__insertsCount = 0;
				this.__increasingKey = options.increasing_key || this.id_key;
				this.__ignoreUpdates = options.ignore_updates;
				if (options.auto_poll) {
					this.auto_destroy(new Timer({
						fire: this.poll,
						context: this,
						start: true,
						delay: options.auto_poll
					}));
				}
			},

			_watchItem : function(id, context) {
				this.__itemCache[id] = {
					context: context,
					value: null
                };
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
					var result = iter.hasNext() ? iter.next()[this.__increasingKey] : null;
					iter.destroy();
					return result;
				}, this).mapError(function () {
					return null;
				});
			},

			_watchInsert : function(query) {
				if (this.__insertsCount === 0) {
					this._queryLastKey().success(function (value) {
						this.__lastKey = value;
						this.__lastKeyIds = {};
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
				if (!this.__ignoreUpdates) {
					Objs.iter(this.__itemCache, function (cached, id) {
						this._store.get(id, cached.context).success(function (data) {
							if (!data)
								this._removedItem(id);
							else {
								var updatable = cached.value && !Comparators.deepEqual(cached.value, data, -1);
                                cached.value = Objs.clone(data, 1);
								if (updatable)
									this._updatedItem(data, data);
							}
						}, this);
					}, this);
				}
				if (this.destroyed())
					return;
				if (this.__lastKey) {
					this.insertsIterator().iterate(function (q) {
						var query = q.query;
						var options = q.options;
						var keyQuery = Objs.objectBy(this.__increasingKey, {"$gte": this.__lastKey});
						this._store.query(Objs.extend(keyQuery, query), options).success(function (result) {
							while (result.hasNext()) {
								var item = result.next();
								var id = item[this.__increasingKey];
								if (!this.__lastKeyIds[id])
									this._insertedInsert(item);
								this.__lastKeyIds[id] = true;
								if (id > this.__lastKey)
									this.__lastKey = id; 
							}
							result.destroy();
						}, this);
					}, this);
				} else {
					this._queryLastKey().success(function (value) {
						if (value !== this.__lastKey) {
							this.__lastKey = value;
							this.__lastKeyIds = {};
						}
					}, this);
				}
			}

		};
	});
});
