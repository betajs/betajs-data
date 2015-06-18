Scoped.define("module:Stores.PartialStoreWriteStrategies.WriteStrategy", [
                                                                          "base:Class"
                                                                          ], function (Class, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {
			
			init: function (partialStore) {
				this.partialStore = partialStore;
			},

			insert: function (data) {},

			remove: function (id) {},

			update: function (data) {}

		};
	});
});

Scoped.define("module:Stores.PartialStoreWriteStrategies.PostWriteStrategy", [
                                                                              "module:Stores.PartialStoreWriteStrategies.WriteStrategy"
                                                                              ], function (Class, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {

			insert: function (data) {
				return this.partialStore.remoteStore.insert(data).mapSuccess(function (data) {
					return this.partialStore.cachedStore.cacheInsert(data, {
						lockItem: false,
						silent: true,
						refreshMeta: true,
						accessMeta: true
					}, this);
				}, this);
			},

			remove: function (id) {
				return this.partialStore.remoteStore.remove(id).mapSuccess(function () {
					return this.partialStore.cachedStore.cacheRemove(id, {
						ignoreLock: true,
						silent: true
					}, this);
				}, this);
			},

			update: function (id, data) {
				return this.partialStore.remoteStore.update(id, data).mapSuccess(function () {
					return this.partialStore.cachedStore.cacheUpdate(id, data, {
						ignoreLock: false,
						lockAttrs: false,
						silent: true,
						refreshMeta: true,
						accessMeta: true
					}, this);
				}, this);
			}

		};
	});
});


Scoped.define("module:Stores.PartialStoreWriteStrategies.PreWriteStrategy", [
                                                                             "module:Stores.PartialStoreWriteStrategies.WriteStrategy"
                                                                             ], function (Class, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {

			insert: function (data) {
				return this.partialStore.cachedStore.cacheInsert(data, {
					lockItem: true,
					silent: true,
					refreshMeta: true,
					accessMeta: true
				}).success(function (data) {
					this.partialStore.remoteStore.insert(data).success(function () {
						this.partialStore.cachedStore.unlockItem(this.partialStore.cachedStore.id_of(data));
					}, this).error(function () {
						this.partialStore.cachedStore.cacheRemove(this.partialStore.cachedStore.id_of(data), {
							ignoreLock: true,
							silent: false
						});
					}, this);
				}, this);
			},

			remove: function (id) {
				return this.partialStore.cachedStore.cacheRemove(id, {
					ignoreLock: true,
					silent: true
				}).success(function () {
					this.partialStore.remoteStore.remove(id);
				}, this);
			},

			update: function (id, data) {
				return this.partialStore.cachedStore.cacheUpdate(id, data, {
					lockAttrs: true,
					ignoreLock: false,
					silent: true,
					refreshMeta: false,
					accessMeta: true
				}).success(function (data) {
					this.partialStore.remoteStore.update(id, data).success(function () {
						this.partialStore.cachedStore.unlockItem(this.partialStore.cachedStore.id_of(data));
					}, this);
				}, this);
			}
	
		};
	});
});


Scoped.define("module:Stores.PartialStoreWriteStrategies.CommitStrategy", [
                                                                           "module:Stores.PartialStoreWriteStrategies.WriteStrategy",
                                                                           "module:Stores.StoreHistory",
                                                                           "module:Stores.MemoryStore",
                                                                           "base:Objs",
                                                                           "base:Timers.Timer"
                                                                           ], function (Class, StoreHistory, MemoryStore, Objs, Timer, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (historyStore, options) {
				inherited.constructor.call(this);
				this._options = options || {};
				this.historyStore = this._options.historyStore || this.auto_destroy(new MemoryStore());
				this.storeHistory = this.auto_destroy(new StoreHistory(null, this.historyStore, {
					source_id_key: this._options.source_id_key || "id",
					row_data: {
						pushed: false,
						success: false
					},
					filter_data: {
						pushed: false
					}
				}));
			},
			
			init: function (partialStore) {
				inherited.init.call(this, partialStore);
				if (this._options.auto_push) {
					this.auto_destroy(new Timer({
						fire: function () {
							this.push(this.partialStore);
						},
						context: this,
						start: true,
						delay: this._options.auto_push
					}));
				}
			},

			insert: function (data) {
				return this.partialStore.cachedStore.cacheInsert(data, {
					lockItem: true,
					silent: true,
					refreshMeta: true,
					accessMeta: true
				}).success(function (data) {
					this.storeHistory.sourceInsert(data);
				}, this);
			},

			remove: function (id) {
				return this.partialStore.cachedStore.cacheRemove(id, {
					ignoreLock: true,
					silent: true
				}).success(function () {
					this.storeHistory.sourceRemove(id);
				}, this);
			},

			update: function (id, data) {
				return this.partialStore.cachedStore.cacheUpdate(id, data, {
					lockAttrs: true,
					ignoreLock: false,
					silent: true,
					refreshMeta: false,
					accessMeta: true
				}).success(function () {
					this.storeHistory.sourceUpdate(id, data);
				}, this);
			},
			
			push: function () {
				if (this.pushing)
					return;
				var failedIds = {};
				var unlockIds = {};
				var hs = this.storeHistory.historyStore;
				var iter = hs.query({success: false}, {sort: {commit_id: 1}}).value();
				var next = function () {
					if (!iter.hasNext()) {
						this.pushing = false;
						Objs.iter(unlockIds, function (value, id) {
							if (value) 
								this.partialStore.cachedStore.unlockItem(id);
						}, this);
						return;
					}
					var commit = iter.next();
					var commit_id = hs.id_of(commit);
					if (commit_id in failedIds) {
						hs.update(commit_id, {
							pushed: true,
							success: false
						});
						next.apply(this);
					} else {
						var promise = null;
						if (commit.type === "insert")
							promise = this.partialStore.remoteStore.insert(commit.row);
						else if (commit.type === "update")
							promise = this.partialStore.remoteStore.update(commit.row_id, commit.row);
						else if (commit.type === "remove")
							promise = this.partialStore.remoteStore.remove(commit.row_id);
						promise.success(function () {
							hs.update(commit_id, {
								pushed: true,
								success: true
							});
							if (!(commit.row_id in unlockIds))
								unlockIds[commit.row_id] = true;
							next.apply(this);
						}, this).error(function () {
							hs.update(commit_id, {
								pushed: true,
								success: false
							});
							failedIds[commit_id] = true;
							unlockIds[commit.row_id] = false;
							next.apply(this);
						}, this);
					}
				};
				next.apply(this);
			}

		};
	});
});
