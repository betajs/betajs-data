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
  					return partialStore.localItemStore.insert(partialStore._addMeta(data));
  				});
  			},
  			
  			remove: function (partialStore, id) {
  				return partialStore.remoteStore.remove(id).mapSuccess(function () {
  					return partialStore.localItemStore.remove(id);
  				});
  			},
  			
  			update: function (partialStore, id, data) {
  				return partialStore.remoteStore.update(id, data).mapSuccess(function () {
  					return partialStore.localItemStore.update(id, partialStore._addMeta(data));
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
  				return partialStore.localItemStore.insert(partialStore._addMeta(data)).success(function (data) {
  					partialStore.remoteStore.insert(partialStore._removeMeta(data)).error(function () {
  						partialStore.localItemStore.remove(partialStore.localItemStore.id_of(data));
  					});
  				});
  			},
  			
  			remove: function (partialStore, id) {
  				return partialStore.localItemStore.get(id).mapSuccess(function (data) {
  					return partialStore.localItemStore.remove(id).success(function () {
  						partialStore.remoteStore.remove(id).error(function () {
  							partialStore.localItemStore.insert(data);
  						});
  					});
  				});
  			},
  			
  			update: function (partialStore, id, data) {
  				return partialStore.localItemStore.get(id).mapSuccess(function (data) {
  					return partialStore.localItemStore.update(id, partialStore._addMeta(data)).success(function () {
  						partialStore.remoteStore.update(id, partialStore._removeMeta(data)).error(function () {
  							partialStore.localItemStore.update(id, data);
  						});
  					});
  				});
  			}
  			
  		};
  	});
  });


Scoped.define("module:Stores.PartialStoreWriteStrategies.CommitStrategy", [
     "module:Stores.PartialStoreWriteStrategies.WriteStrategy",
     "module:Stores.StoreHistory",
     "base:Objs"
], function (Class, StoreHistory, Objs, scoped) {
  	return Class.extend({scoped: scoped}, function (inherited) {
  		return {
  			
  			constructor: function (historyStore, options) {
  				inherited.constructor.call(this);
  				options = options || {};
  				this.storeHistory = this.auto_destroy(new StoreHistory(null, historyStore, {
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
  				return partialStore.localItemStore.insert(partialStore._addMeta(data, {locked: true})).success(function (data) {
  					this.storeHistory.sourceInsert(partialStore._removeMeta(data));
  				}, this);
  			},
  			
  			remove: function (partialStore, id) {
				return partialStore.localItemStore.remove(id).success(function () {
					this.storeHistory.sourceRemove(id);
				}, this);
  			},
  			
  			update: function (partialStore, id, data) {
				return partialStore.localItemStore.update(id, partialStore._addMeta(data, {locked: true})).success(function () {
					this.storeHistory.sourceUpdate(id, partialStore._removeMeta(data));
				}, this);
  			},
  			
  			push: function (partialStore) {
  				if (partialStore.pushing)
  					return;
  				partialStore.pushing = true;
  				var failedIds = {};
  				var unlockIds = {};
  				var hs = this.storeHistory.historyStore;
  				var iter = hs.query({success: false}, {sort: {commit_id: 1}}).value();
  				var next = function () {
  					if (!iter.hasNext()) {
  						partialStore.pushing = false;
  						Objs.iter(unlockIds, function (value, id) {
  							if (value) 
  								partialStore.localItemStore.update(id, partialStore._addMeta({}, {locked: false}));
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
