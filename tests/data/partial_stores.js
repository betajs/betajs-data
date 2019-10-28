QUnit.test("test partial stores, post write strategy, no watchers", function (assert) {
	var remoteStore = new BetaJS.Data.Stores.SimulatorStore(new BetaJS.Data.Stores.MemoryStore({
		id_generator: new BetaJS.IdGenerators.PrefixedIdGenerator(
			"remote_id",
			new BetaJS.IdGenerators.TimedIdGenerator()
		)
	}));
	var ids = [];
	var globalTime = 0;
	for (var i = 0; i <= 4; ++i) {
		var current = [];
		ids.push(current);
		for (var j = 0; j <= 9; ++j)
			current.push(remoteStore.insert({i:i,j:j}).value().id);
	}
	var store = new BetaJS.Data.Stores.PartialStore(remoteStore, {
		cacheStrategy: new BetaJS.Data.Stores.CacheStrategies.ExpiryCacheStrategy({
			itemRefreshTime: 20,
			itemAccessTime: 10,
			queryRefreshTime: 20,
			queryAccessTime: 10,
			now: function () {
				return globalTime;
			}
		}),
		itemCache: new BetaJS.Data.Stores.MemoryStore({
			id_generator: new BetaJS.IdGenerators.PrefixedIdGenerator(
				"local_id",
				new BetaJS.IdGenerators.TimedIdGenerator()
			)
		})
	});
	// Queries remote store, caches locally
	assert.equal(store.query({i: 0}).value().asArray().length, 10);
	
	remoteStore.online = false;
	
	// Failover to local cache
	assert.equal(store.query({i: 1}).value().asArray().length, 0);
	assert.equal(store.query({j: 0}).value().asArray().length, 1);
	// Cleanup should not delete anything since we have a failover
	globalTime = 50;
	store.cachedStore.cleanup();	
	assert.equal(store.query({i: 0}).value().asArray().length, 10);
	// Back online
	remoteStore.online = true;	
	assert.equal(store.query({j: 4}).value().asArray().length, 5);
	// Now it should clean everything, since we are online
	globalTime = 100;
	store.cachedStore.cleanup();
	remoteStore.online = false;
	assert.equal(store.query({i: 0}).value().asArray().length, 0);
	// Online again
	remoteStore.online = true;
	assert.equal(store.query({i: 1}).value().asArray().length, 10);
	assert.equal(store.query({j: 0}).value().asArray().length, 5);
	assert.equal(remoteStore.query().value().asArray().length, 50);
	// Insert locally
	store.insert({i: 5, j: 0});
	assert.equal(remoteStore.query().value().asArray().length, 51);
	// Offline insert should fail
	remoteStore.online = false;
	store.insert({i: 5, j: 1}).success(function () {
		assert.ok(false, "Insert has to fail");
	});
});


QUnit.test("test partial stores, pre write strategy, no watchers", function (assert) {
	var remoteStore = new BetaJS.Data.Stores.SimulatorStore(new BetaJS.Data.Stores.MemoryStore({
		id_generator: new BetaJS.IdGenerators.PrefixedIdGenerator(
			"remote_id",
			new BetaJS.IdGenerators.TimedIdGenerator()
		)
	}));
	var ids = [];
	var globalTime = 0;
	for (var i = 0; i <= 4; ++i) {
		var current = [];
		ids.push(current);
		for (var j = 0; j <= 9; ++j)
			current.push(remoteStore.insert({i:i,j:j}).value().id);
	}
	var store = new BetaJS.Data.Stores.PartialStore(remoteStore, {
		cacheStrategy: new BetaJS.Data.Stores.CacheStrategies.ExpiryCacheStrategy({
			itemRefreshTime: 20,
			itemAccessTime: 10,
			queryRefreshTime: 20,
			queryAccessTime: 10,
			now: function () {
				return globalTime;
			}
		}),
		writeStrategy: new BetaJS.Data.Stores.PartialStoreWriteStrategies.PreWriteStrategy(),
		itemCache: new BetaJS.Data.Stores.MemoryStore({
			id_generator: new BetaJS.IdGenerators.PrefixedIdGenerator(
				"local_id",
				new BetaJS.IdGenerators.TimedIdGenerator()
			)
		})
	});
	store.insert({i: 5, j: 0});
	assert.equal(remoteStore.query().value().asArray().length, 51);
	remoteStore.online = false;
	assert.equal(store.query().value().asArray().length, 1);
	store.insert({i: 5, j: 1});
	assert.equal(store.query().value().asArray().length, 1);
	remoteStore.online = true;
	assert.equal(remoteStore.query().value().asArray().length, 51);
});



QUnit.test("test partial stores, commit write strategy, no watchers", function (assert) {
	var remoteStore = new BetaJS.Data.Stores.SimulatorStore(new BetaJS.Data.Stores.MemoryStore({
		id_generator: new BetaJS.IdGenerators.PrefixedIdGenerator(
			"remote_id",
			new BetaJS.IdGenerators.TimedIdGenerator()
		)
	}));
	var ids = [];
	var globalTime = 0;
	for (var i = 0; i <= 4; ++i) {
		var current = [];
		ids.push(current);
		for (var j = 0; j <= 9; ++j)
			current.push(remoteStore.insert({i:i,j:j}).value().id);
	}
	var store = new BetaJS.Data.Stores.PartialStore(remoteStore, {
		cacheStrategy: new BetaJS.Data.Stores.CacheStrategies.ExpiryCacheStrategy({
			itemRefreshTime: 20,
			itemAccessTime: 10,
			queryRefreshTime: 20,
			queryAccessTime: 10,
			now: function () {
				return globalTime;
			}
		}),
		writeStrategy: new BetaJS.Data.Stores.PartialStoreWriteStrategies.CommitStrategy(),
		itemCache: new BetaJS.Data.Stores.MemoryStore({
			id_generator: new BetaJS.IdGenerators.PrefixedIdGenerator(
				"local_id",
				new BetaJS.IdGenerators.TimedIdGenerator()
			)
		})
	});
	store.insert({i: 5, j: 0});
	assert.equal(remoteStore.query().value().asArray().length, 50);
	store.writeStrategy.push();
	assert.equal(remoteStore.query().value().asArray().length, 51);
	assert.equal(remoteStore.query({i: 5}).value().asArray().length, 1);
	assert.equal(store.query({i: 5}).value().asArray().length, 1);
	remoteStore.insert({i: 5, j: 1});
	assert.equal(remoteStore.query({i: 5}).value().asArray().length, 2);
	assert.equal(store.query({i: 5}).value().asArray().length, 1);
});



QUnit.test("test partial stores, commit write strategy, with watchers", function (assert) {
	var remoteStore = new BetaJS.Data.Stores.SimulatorStore(new BetaJS.Data.Stores.MemoryStore({
		id_generator: new BetaJS.IdGenerators.PrefixedIdGenerator(
			"remote_id",
			new BetaJS.IdGenerators.TimedIdGenerator()
		)
	}));
	var remoteWatcher = new BetaJS.Data.Stores.Watchers.PollWatcher(remoteStore);
	var ids = [];
	var globalTime = 0;
	for (var i = 0; i <= 4; ++i) {
		var current = [];
		ids.push(current);
		for (var j = 0; j <= 9; ++j)
			current.push(remoteStore.insert({i:i,j:j}).value().id);
	}
	var store = new BetaJS.Data.Stores.PartialStore(remoteStore, {
		cacheStrategy: new BetaJS.Data.Stores.CacheStrategies.ExpiryCacheStrategy({
			itemRefreshTime: 20,
			itemAccessTime: 10,
			queryRefreshTime: 20,
			queryAccessTime: 10,
			now: function () {
				return globalTime;
			}
		}),
		writeStrategy: new BetaJS.Data.Stores.PartialStoreWriteStrategies.CommitStrategy(),
		itemCache: new BetaJS.Data.Stores.MemoryStore({
			id_generator: new BetaJS.IdGenerators.PrefixedIdGenerator(
				"local_id",
				new BetaJS.IdGenerators.TimedIdGenerator()
			)
		}),
		remoteWatcher: remoteWatcher
	});
	store.insert({i: 5, j: 0});
	assert.equal(remoteStore.query().value().asArray().length, 50);
	store.writeStrategy.push();
	assert.equal(remoteStore.query().value().asArray().length, 51);
	assert.equal(remoteStore.query({i: 5}).value().asArray().length, 1);
	assert.equal(store.query({i: 5}).value().asArray().length, 1);
	remoteStore.insert({i: 5, j: 1});
	assert.equal(remoteStore.query({i: 5}).value().asArray().length, 2);
	remoteWatcher.poll();
	assert.equal(store.query({i: 5}).value().asArray().length, 1);
	remoteWatcher.watchInsert({i: 5}, {});
	remoteStore.insert({i: 5, j: 2});
	assert.equal(store.query({i: 5}).value().asArray().length, 1);
	remoteWatcher.poll();
	assert.equal(store.query({i: 5}).value().asArray().length, 3);
});



QUnit.test("test partial stores, different ids, post write strategy, no watchers", function (assert) {
	var remoteStore = new BetaJS.Data.Stores.SimulatorStore(new BetaJS.Data.Stores.MemoryStore({
		id_key: "remote_id",
		id_generator: new BetaJS.IdGenerators.PrefixedIdGenerator(
			"remote_id",
			new BetaJS.IdGenerators.TimedIdGenerator()
		)
	}));
	var itemCache = new BetaJS.Data.Stores.MemoryStore({
		id_key: "local_id",
		id_generator: new BetaJS.IdGenerators.PrefixedIdGenerator(
			"local_id",
			new BetaJS.IdGenerators.TimedIdGenerator()
		)
	});
	var globalTime = 0;
	var store = new BetaJS.Data.Stores.PartialStore(remoteStore, {
		cacheStrategy: new BetaJS.Data.Stores.CacheStrategies.ExpiryCacheStrategy({
			itemRefreshTime: 20,
			itemAccessTime: 10,
			queryRefreshTime: 20,
			queryAccessTime: 10,
			now: function () {
				return globalTime;
			}
		}),
		itemCache: itemCache
	});

	store.insert({foo: "bar"}).success(function (item) {
		assert.equal(!!item.remote_id, true);
		assert.equal(!!item.local_id, true);
		assert.equal(item.foo, "bar");
		assert.equal(remoteStore.query({},{}).value().asArray().length, 1);
		assert.equal(itemCache.query({},{}).value().asArray().length, 1);
		store.remove(item.local_id).success(function () {
			assert.equal(remoteStore.query({},{}).value().asArray().length, 0);
			assert.equal(itemCache.query({},{}).value().asArray().length, 0);
		}).error(function () {
			assert.ok(false);
		});
	}).error(function () {
		assert.ok(false);
	});
});



QUnit.test("test partial stores, different ids, pre write strategy, no watchers", function (assert) {
	var remoteStore = new BetaJS.Data.Stores.SimulatorStore(new BetaJS.Data.Stores.MemoryStore({
		id_key: "remote_id",
		id_generator: new BetaJS.IdGenerators.PrefixedIdGenerator(
			"remote_id",
			new BetaJS.IdGenerators.TimedIdGenerator()
		)
	}));
	var itemCache = new BetaJS.Data.Stores.MemoryStore({
		id_key: "local_id",
		id_generator: new BetaJS.IdGenerators.PrefixedIdGenerator(
			"local_id",
			new BetaJS.IdGenerators.TimedIdGenerator()
		)
	});
	var globalTime = 0;
	var store = new BetaJS.Data.Stores.PartialStore(remoteStore, {
		cacheStrategy: new BetaJS.Data.Stores.CacheStrategies.ExpiryCacheStrategy({
			itemRefreshTime: 20,
			itemAccessTime: 10,
			queryRefreshTime: 20,
			queryAccessTime: 10,
			now: function () {
				return globalTime;
			}
		}),
		writeStrategy: new BetaJS.Data.Stores.PartialStoreWriteStrategies.PreWriteStrategy(),
		itemCache: itemCache
	});

	store.insert({foo: "bar"}).success(function (item) {
		assert.equal(!!item.remote_id, true);
		assert.equal(!!item.local_id, true);
		assert.equal(item.foo, "bar");
		assert.equal(remoteStore.query({},{}).value().asArray().length, 1);
		assert.equal(itemCache.query({},{}).value().asArray().length, 1);
		store.remove(item.local_id).success(function () {
			assert.equal(remoteStore.query({},{}).value().asArray().length, 0);
			assert.equal(itemCache.query({},{}).value().asArray().length, 0);
		}).error(function () {
			assert.ok(false);
		});
	}).error(function () {
		assert.ok(false);
	});
});


QUnit.test("test partial stores, different ids, commit write strategy, no watchers", function (assert) {
	var remoteStore = new BetaJS.Data.Stores.SimulatorStore(new BetaJS.Data.Stores.MemoryStore({
		id_key: "remote_id",
		id_generator: new BetaJS.IdGenerators.PrefixedIdGenerator(
			"remote_id",
			new BetaJS.IdGenerators.TimedIdGenerator()
		)
	}));
	var itemCache = new BetaJS.Data.Stores.MemoryStore({
		id_key: "local_id",
		id_generator: new BetaJS.IdGenerators.PrefixedIdGenerator(
			"local_id",
			new BetaJS.IdGenerators.TimedIdGenerator()
		)
	});
	var globalTime = 0;
	var store = new BetaJS.Data.Stores.PartialStore(remoteStore, {
		cacheStrategy: new BetaJS.Data.Stores.CacheStrategies.ExpiryCacheStrategy({
			itemRefreshTime: 20,
			itemAccessTime: 10,
			queryRefreshTime: 20,
			queryAccessTime: 10,
			now: function () {
				return globalTime;
			}
		}),
		writeStrategy: new BetaJS.Data.Stores.PartialStoreWriteStrategies.CommitStrategy(),
		itemCache: itemCache
	});

	store.insert({foo: "bar"}).success(function (item) {
		assert.equal(!!item.remote_id, false, "has remote id");
		assert.equal(!!item.local_id, true, "no local id");
		assert.equal(item.foo, "bar");
		assert.equal(itemCache.query({},{}).value().asArray().length, 1);
		assert.equal(remoteStore.query({},{}).value().asArray().length, 0);
		store.update(item.local_id, {foo: "baz"}).success(function () {
			store.get(item.local_id).success(function (itemUpdated) {
				assert.equal(itemUpdated.foo, "baz");
                store.writeStrategy.push();
                item = itemCache.query({},{}).value().next();
                assert.equal(!!item.remote_id, true, "item should now have a remote id");
                assert.equal(remoteStore.query({},{}).value().asArray().length, 1);
                store.remove(item.local_id).success(function () {
                    assert.equal(remoteStore.query({},{}).value().asArray().length, 1);
                    assert.equal(itemCache.query({},{}).value().asArray().length, 0);
                    store.writeStrategy.push();
                    assert.equal(remoteStore.query({},{}).value().asArray().length, 0);
                }).error(function () {
                    assert.ok(false);
                });
            }).error(function () {
                assert.ok(false);
            });
		}).error(function () {
            assert.ok(false);
        });
	}).error(function () {
		assert.ok(false);
	});
});


QUnit.test("commit strategy push", function (assert) {
	var remoteStore = new BetaJS.Data.Stores.MemoryStore();
	var asyncRemoteStore = new BetaJS.Data.Stores.AsyncStore(remoteStore);

	var writeStrategy = new BetaJS.Data.Stores.PartialStoreWriteStrategies.CommitStrategy();
	var partialStore = new BetaJS.Data.Stores.PartialStore(asyncRemoteStore, {
		writeStrategy: writeStrategy
	});

	var done = assert.async();

	partialStore.insert({foo: "bar"}).success(function (model) {
		assert.equal(remoteStore.query().value().asArray().length, 0);
		var push = writeStrategy.push();
        assert.equal(remoteStore.query().value().asArray().length, 0);
        partialStore.update(model.id, {foo: "baz"}).success(function () {
            assert.equal(remoteStore.query().value().asArray().length, 0);
            push.success(function () {
                assert.equal(remoteStore.count().value(), 1);
                writeStrategy.push().success(function () {
                    assert.equal(remoteStore.count().value(), 1);
                    done();
				});
			});
		});
	});

});




QUnit.test("test partial stores, commit write strategy, meta", function (assert) {
	var remoteStore = new BetaJS.Data.Stores.SimulatorStore(new BetaJS.Data.Stores.MemoryStore({
		id_generator: new BetaJS.IdGenerators.PrefixedIdGenerator(
			"remote_id",
			new BetaJS.IdGenerators.TimedIdGenerator()
		)
	}));
	var id = remoteStore.insert({i:3,j:5}).value().id;
	var globalTime = 0;
	var store = new BetaJS.Data.Stores.PartialStore(remoteStore, {
		cacheStrategy: new BetaJS.Data.Stores.CacheStrategies.ExpiryCacheStrategy({
			itemRefreshTime: 20,
			itemAccessTime: 10,
			queryRefreshTime: 20,
			queryAccessTime: 10,
			now: function () {
				return globalTime;
			}
		}),
		writeStrategy: new BetaJS.Data.Stores.PartialStoreWriteStrategies.CommitStrategy(),
		itemCache: new BetaJS.Data.Stores.MemoryStore({
			id_generator: new BetaJS.IdGenerators.PrefixedIdGenerator(
				"local_id",
				new BetaJS.IdGenerators.TimedIdGenerator()
			)
		}),
		hideMetaData: false
	});
	assert.ok(store.get(id).value().meta);
	assert.ok(!store.get(id).value().meta.pendingUpdate);
	store.once("update", function (dummy, data) {
		assert.equal(data.meta.pendingUpdate, true);
	});
	store.update(id, {k: 7});
	assert.ok(store.get(id).value().meta.pendingUpdate);
	store.once("update", function (dummy, data) {
		assert.equal(data.meta.pendingUpdate, false);
	});
	store.writeStrategy.push();
	assert.ok(!store.get(id).value().meta.pendingUpdate);
});