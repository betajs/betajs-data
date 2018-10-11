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

			update: function (data, ctx, transaction_id) {}

		};
	});
});

Scoped.define("module:Stores.PartialStoreWriteStrategies.PostWriteStrategy", [
	"module:Stores.PartialStoreWriteStrategies.WriteStrategy",
	"base:Types",
	"base:Objs"
], function (Class, Types, Objs, scoped) {
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

			update: function (cachedId, data, ctx, transaction_id) {
				var inner = function (updatedData) {
					var merger = Objs.extend(Objs.clone(data, 1), updatedData);
                    return this.partialStore.cachedStore.cacheUpdate(cachedId, merger, {
                        ignoreLock: false,
                        lockAttrs: false,
                        silent: true,
                        refreshMeta: true,
                        accessMeta: true
                    }, ctx, transaction_id);
				};
                var remoteRequired = !Types.is_empty(this.partialStore.cachedStore.removeItemSupp(data));
                if (!remoteRequired)
                	return inner.call(this);
				return this.partialStore.cachedStore.cachedIdToRemoteId(cachedId).mapSuccess(function (remoteId) {
					return this.partialStore.remoteStore.update(remoteId, data, ctx, transaction_id).mapSuccess(function (updatedData) {
						return inner.call(this, updatedData);
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

            constructor: function (historyStore, options) {
                inherited.constructor.call(this);
                this._options = options || {};
            },

			insert: function (data) {
				return this.partialStore.cachedStore.cacheInsert(data, {
					lockItem: true,
					silent: true,
					refreshMeta: true,
					accessMeta: true
				}).mapSuccess(function (data) {
					nosuppdata = this.partialStore.cachedStore.removeItemSupp(data);
					var promise = this.partialStore.remoteStore.insert(nosuppdata).mapSuccess(function (remoteData) {
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
					return this._options.optimistic ? data : promise;
				}, this);
			},

			remove: function (cachedId) {
				return this.partialStore.cachedStore.cachedIdToRemoteId(cachedId).mapSuccess(function (remoteId) {
					var promise = this.partialStore.cachedStore.cacheRemove(cachedId, {
						ignoreLock: true,
						silent: true
					}).success(function () {
						this.partialStore.remoteStore.remove(remoteId);
					}, this);
                    return this._options.optimistic ? data : promise;
				}, this);
			},

			update: function (cachedId, data, ctx, transaction_id) {
				return this.partialStore.cachedStore.cachedIdToRemoteId(cachedId).mapSuccess(function (remoteId) {
					var promise = this.partialStore.cachedStore.cacheUpdate(cachedId, data, {
						lockAttrs: true,
						ignoreLock: false,
						silent: true,
						refreshMeta: false,
						accessMeta: true
					}, ctx, transaction_id).success(function (data) {
						data = this.partialStore.cachedStore.removeItemSupp(data);
						this.partialStore.remoteStore.update(remoteId, data, ctx, transaction_id).success(function () {
							this.partialStore.cachedStore.unlockItem(cachedId);
						}, this);
					}, this);
                    return this._options.optimistic ? data : promise;
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
	"base:Timers.Timer",
	"base:Promise"
], function (Class, StoreHistory, MemoryStore, Objs, Timer, Promise, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (historyStore, options) {
				inherited.constructor.call(this);
				this._options = options || {};
				this.historyStore = this._options.historyStore || this.auto_destroy(new MemoryStore());
			},
			
			init: function (partialStore) {
				inherited.init.call(this, partialStore);
				this.storeHistory = this.auto_destroy(new StoreHistory(null, this.historyStore, Objs.extend({
					source_id_key: partialStore.cachedStore.itemCache.id_key(),
					row_data: {
						pushed: false,
						success: false
					},
					filter_data: {
						pushed: false
					}
				}, this._options)));
				if (this._options.auto_push) {
					this._timer = this.auto_destroy(new Timer({
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
					}).mapSuccess(function (data) {
						this.storeHistory.sourceRemove(id, this.partialStore.remoteStore.id_row(remoteId));
						return data;
					}, this);
				}, this);
			},

			update: function (id, data, ctx, transaction_id) {
				return this.partialStore.cachedStore.cacheUpdate(id, data, {
					lockAttrs: true,
					ignoreLock: true, // this was false before, not sure why.
					silent: true,
					refreshMeta: false,
					accessMeta: true
				}, ctx, transaction_id).success(function () {
					data = this.partialStore.cachedStore.removeItemSupp(data);
					this.storeHistory.sourceUpdate(id, data);
				}, this);
			},
			
			push: function () {
				if (this.pushing)
					return Promise.value(true);
				var failedIds = {};
				var unlockIds = {};
				var hs = this.storeHistory.historyStore;
                this.storeHistory.lockCommits();
				var iter = hs.query({success: false}, {sort: {commit_id: 1}}).value();
				var next = function () {
					if (!iter.hasNext()) {
						this.pushing = false;
						this.storeHistory.unlockCommits();
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
                        iter.destroy();
						return Promise.value(true);
					}
					var commit = iter.next();
					var commit_id = hs.id_of(commit);
					if (commit_id in failedIds) {
						hs.update(commit_id, {
							pushed: true,
							success: false
						});
						return next.apply(this);
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
						return promise.mapSuccess(function (ret) {
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
							return next.apply(this);
						}, this).mapError(function () {
							hs.update(commit_id, {
								pushed: true,
								success: false
							});
							failedIds[commit_id] = true;
							unlockIds[commit.row_id] = false;
							return next.apply(this);
						}, this);
					}
				};
				return next.apply(this);
			}

		};
	});
});



Scoped.define("module:Stores.PartialStoreWriteStrategies.DelegatedWriteStrategy", [
    "module:Stores.PartialStoreWriteStrategies.WriteStrategy"
], function (Class, scoped) {
    return Class.extend({scoped: scoped}, function (inherited) {
        return {

            constructor: function (insertWriteStrategy, updateWriteStrategy, removeWriteStrategy) {
                inherited.constructor.call(this);
                this._insertWriteStrategy = insertWriteStrategy;
                this._updateWriteStrategy = updateWriteStrategy;
                this._removeWriteStrategy = removeWriteStrategy;
            },

            init: function (partialStore) {
                inherited.init.call(this, partialStore);
                this._insertWriteStrategy.init(partialStore);
                this._updateWriteStrategy.init(partialStore);
                this._removeWriteStrategy.init(partialStore);
            },

            insert: function () {
                return this._insertWriteStrategy.insert.apply(this._insertWriteStrategy, arguments);
            },

            remove: function () {
                return this._updateWriteStrategy.remove.apply(this._updateWriteStrategy, arguments);
            },

            update: function () {
                return this._removeWriteStrategy.update.apply(this._removeWriteStrategy, arguments);
            }

        };
    });
});

