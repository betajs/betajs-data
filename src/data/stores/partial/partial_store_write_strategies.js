Scoped.define("module:Stores.PartialStoreWriteStrategies.WriteStrategy", [
                                                                          "base:Class"
                                                                          ], function (Class, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {
			
			init: function (partialStore) {
				this.partialStore = partialStore;
			},

			insert: function (data, ctx) {},

			remove: function (id, ctx) {},

			update: function (data, ctx) {}

		};
	});
});

Scoped.define("module:Stores.PartialStoreWriteStrategies.PostWriteStrategy", [
	"module:Stores.PartialStoreWriteStrategies.WriteStrategy",
	"base:Types"
], function (Class, Types, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {

			insert: function (data, ctx) {
				return this.partialStore.remoteStore.insert(data, ctx).mapSuccess(function (data) {
					return this.partialStore.cachedStore.cacheInsert(data, {
						lockItem: false,
						silent: true,
						refreshMeta: true,
						accessMeta: true
					}, ctx);
				}, this);
			},

			remove: function (cachedId, ctx) {
				return this.partialStore.cachedStore.cachedIdToRemoteId(cachedId).mapSuccess(function (remoteId) {
					return this.partialStore.remoteStore.remove(remoteId, ctx).mapSuccess(function () {
						return this.partialStore.cachedStore.cacheRemove(cachedId, {
							ignoreLock: true,
							silent: true
						}, ctx);
					}, this);
				}, this);
			},

			update: function (cachedId, data, ctx) {
				var inner = function () {
                    return this.partialStore.cachedStore.cacheUpdate(cachedId, data, {
                        ignoreLock: false,
                        lockAttrs: false,
                        silent: true,
                        refreshMeta: true,
                        accessMeta: true
                    }, ctx);
				};
                var remoteRequired = !Types.is_empty(this.partialStore.cachedStore.removeItemSupp(data));
                if (!remoteRequired)
                	return inner.call(this);
				return this.partialStore.cachedStore.cachedIdToRemoteId(cachedId).mapSuccess(function (remoteId) {
					return this.partialStore.remoteStore.update(remoteId, data, ctx).mapSuccess(function () {
						return inner.call(this);
					}, this);
				}, this);
			}

		};
	});
});


Scoped.define("module:Stores.PartialStoreWriteStrategies.PreWriteStrategy", [
    "module:Stores.PartialStoreWriteStrategies.WriteStrategy",
    "base:Objs"
], function (Class, Objs, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {

			insert: function (data) {
				return this.partialStore.cachedStore.cacheInsert(data, {
					lockItem: true,
					silent: true,
					refreshMeta: true,
					accessMeta: true
				}).mapSuccess(function (data) {
					nosuppdata = this.partialStore.cachedStore.removeItemSupp(data);
					return this.partialStore.remoteStore.insert(nosuppdata).mapSuccess(function (remoteData) {
						return this.partialStore.cachedStore.cacheUpdate(this.partialStore.cachedStore.id_of(data), remoteData, {
							silent: true,
							unlockItem: true
						}).mapSuccess(function (addedRemoteData) {
							return Objs.extend(Objs.clone(data, 1), addedRemoteData);
						}, this);
					}, this).error(function () {
						this.partialStore.cachedStore.cacheRemove(this.partialStore.cachedStore.id_of(data), {
							ignoreLock: true,
							silent: false
						});
					}, this);
				}, this);
			},

			remove: function (cachedId) {
				return this.partialStore.cachedStore.cachedIdToRemoteId(cachedId).mapSuccess(function (remoteId) {
					return this.partialStore.cachedStore.cacheRemove(cachedId, {
						ignoreLock: true,
						silent: true
					}).success(function () {
						this.partialStore.remoteStore.remove(remoteId);
					}, this);
				}, this);
			},

			update: function (cachedId, data) {
				return this.partialStore.cachedStore.cachedIdToRemoteId(cachedId).mapSuccess(function (remoteId) {
					return this.partialStore.cachedStore.cacheUpdate(cachedId, data, {
						lockAttrs: true,
						ignoreLock: false,
						silent: true,
						refreshMeta: false,
						accessMeta: true
					}).success(function (data) {
						data = this.partialStore.cachedStore.removeItemSupp(data);
						this.partialStore.remoteStore.update(remoteId, data).success(function () {
							this.partialStore.cachedStore.unlockItem(cachedId);
						}, this);
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
			},
			
			init: function (partialStore) {
				inherited.init.call(this, partialStore);
				this.storeHistory = this.auto_destroy(new StoreHistory(null, this.historyStore, {
					source_id_key: partialStore.cachedStore.itemCache.id_key(),
					row_data: {
						pushed: false,
						success: false
					},
					filter_data: {
						pushed: false
					}
				}));
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
					data = this.partialStore.cachedStore.removeItemSupp(data);
					this.storeHistory.sourceInsert(data);
				}, this);
			},

			remove: function (id) {
				return this.partialStore.cachedStore.cachedIdToRemoteId(id).mapSuccess(function (remoteId) {
					return this.partialStore.cachedStore.cacheRemove(id, {
						ignoreLock: true,
						silent: true
					}).success(function () {
						this.storeHistory.sourceRemove(id, this.partialStore.remoteStore.id_row(remoteId));
					}, this);
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
					data = this.partialStore.cachedStore.removeItemSupp(data);
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
							if (value) {
								if (value === true) {
									this.partialStore.cachedStore.unlockItem(id);
								} else {
									this.partialStore.cachedStore.cacheUpdate(id, value, {
										unlockItem: true,
										silent: true
									});
								}
							}
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
						if (commit.type === "insert") {
							promise = this.partialStore.remoteStore.insert(commit.row);
						} else if (commit.type === "update") {
							promise = this.partialStore.cachedStore.cachedIdToRemoteId(commit.row_id).mapSuccess(function (remoteId) {
								return this.partialStore.remoteStore.update(remoteId, commit.row);
							}, this);
						} else if (commit.type === "remove") {
							promise = this.partialStore.remoteStore.remove(commit.row ? this.partialStore.remoteStore.id_of(commit.row) : commit.row_id);
						}
						promise.success(function (ret) {
							hs.update(commit_id, {
								pushed: true,
								success: true
							});
							if (!(commit.row_id in unlockIds)) {
								unlockIds[commit.row_id] = true;
								if (commit.type === "insert") {
									unlockIds[commit.row_id] = ret;
								}
							}
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
