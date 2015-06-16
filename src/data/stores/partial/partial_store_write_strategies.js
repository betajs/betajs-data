Scoped.define("module:Stores.PartialStoreWriteStrategies.WriteStrategy", [
                                                                          "base:Class"
                                                                          ], function (Class, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {

			insert: function (partialStore, data) {},

			remove: function (partialStore, id) {},

			update: function (partialStore, data) {}

		};
	});
});

Scoped.define("module:Stores.PartialStoreWriteStrategies.PostWriteStrategy", [
                                                                              "module:Stores.PartialStoreWriteStrategies.WriteStrategy"
                                                                              ], function (Class, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {

			insert: function (partialStore, data) {
				return partialStore.remoteStore.insert(data).mapSuccess(function (data) {
					return partialStore.cachedStore.cacheInsert(data, {
						lockItem: false,
						silent: true,
						refreshMeta: true,
						accessMeta: true
					});
				});
			},

			remove: function (partialStore, id) {
				return partialStore.remoteStore.remove(id).mapSuccess(function () {
					return partialStore.cachedStore.cacheRemove(id, {
						ignoreLock: true,
						silent: true
					});
				});
			},

			update: function (partialStore, id, data) {
				return partialStore.remoteStore.update(id, data).mapSuccess(function () {
					return partialStore.cachedStore.cacheUpdate(id, data, {
						ignoreLock: false,
						lockAttrs: false,
						silent: true,
						refreshMeta: true,
						accessMeta: true
					});
				});
			}

		};
	});
});


Scoped.define("module:Stores.PartialStoreWriteStrategies.PreWriteStrategy", [
                                                                             "module:Stores.PartialStoreWriteStrategies.WriteStrategy"
                                                                             ], function (Class, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {

			insert: function (partialStore, data) {
				return partialStore.cachedStore.cacheInsert(data, {
					lockItem: true,
					silent: true,
					refreshMeta: true,
					accessMeta: true
				}).success(function (data) {
					partialStore.remoteStore.insert(data).success(function () {
						partialStore.cachedStore.unlockItem(partialStore.cachedStore.id_of(data));
					}).error(function () {
						partialStore.cachedStore.cacheRemove(partialStore.cachedStore.id_of(data), {
							ignoreLock: true,
							silent: false
						});
					});
				});
			},

			remove: function (partialStore, id) {
				return partialStore.cachedStore.cacheRemove(id, {
					ignoreLock: true,
					silent: true
				}).success(function () {
					partialStore.remoteStore.remove(id);
				});
			},

			update: function (partialStore, id, data) {
				return partialStore.cachedStore.cacheUpdate(id, data, {
					lockAttrs: true,
					ignoreLock: false,
					silent: true,
					refreshMeta: false,
					accessMeta: true
				}).success(function (data) {
					partialStore.remoteStore.update(id, data).success(function () {
						partialStore.cachedStore.unlockItem(partialStore.cachedStore.id_of(data));
					});
				});
			}
	
		};
	});
});


Scoped.define("module:Stores.PartialStoreWriteStrategies.CommitStrategy", [
                                                                           "module:Stores.PartialStoreWriteStrategies.WriteStrategy",
                                                                           "module:Stores.StoreHistory",
                                                                           "module:Stores.MemoryStore",
                                                                           "base:Objs"
                                                                           ], function (Class, StoreHistory, MemoryStore, Objs, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (historyStore, options) {
				inherited.constructor.call(this);
				options = options || {};
				this.historyStore = options.historyStore || this.auto_destroy(new MemoryStore());
				this.storeHistory = this.auto_destroy(new StoreHistory(null, this.historyStore, {
					source_id_key: options.source_id_key || "id",
					row_data: {
						pushed: false,
						success: false
					},
					filter_data: {
						pushed: false
					}
				}));
			},

			insert: function (partialStore, data) {
				return partialStore.cachedStore.cacheInsert(data, {
					lockItem: true,
					silent: true,
					refreshMeta: true,
					accessMeta: true
				}).success(function (data) {
					this.storeHistory.sourceInsert(data);
				}, this);
			},

			remove: function (partialStore, id) {
				return partialStore.cachedStore.cacheRemove(id, {
					ignoreLock: true,
					silent: true
				}).success(function () {
					this.storeHistory.sourceRemove(id);
				}, this);
			},

			update: function (partialStore, id, data) {
				return partialStore.cachedStore.cacheUpdate(id, data, {
					lockAttrs: true,
					ignoreLock: false,
					silent: true,
					refreshMeta: false,
					accessMeta: true
				}).success(function () {
					this.storeHistory.sourceUpdate(id, data);
				}, this);
			},

			push: function (partialStore) {
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
								partialStore.cachedStore.unlockItem(id);
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
							promise = partialStore.remoteStore.insert(commit.row);
						else if (commit.type === "update")
							promise = partialStore.remoteStore.update(commit.row_id, commit.row);
						else if (commit.type === "remove")
							promise = partialStore.remoteStore.remove(commit.row_id);
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
