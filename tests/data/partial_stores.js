test("test partial stores, post write strategy, no watchers", function() {
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
	QUnit.equal(store.query({i: 0}).value().asArray().length, 10);
	
	remoteStore.online = false;
	
	// Failover to local cache
	QUnit.equal(store.query({i: 1}).value().asArray().length, 0);
	QUnit.equal(store.query({j: 0}).value().asArray().length, 1);
	// Cleanup should not delete anything since we have a failover
	globalTime = 50;
	store.cachedStore.cleanup();	
	QUnit.equal(store.query({i: 0}).value().asArray().length, 10);
	// Back online
	remoteStore.online = true;	
	QUnit.equal(store.query({j: 4}).value().asArray().length, 5);
	// Now it should clean everything, since we are online
	globalTime = 100;
	store.cachedStore.cleanup();
	remoteStore.online = false;
	QUnit.equal(store.query({i: 0}).value().asArray().length, 0);
	// Online again
	remoteStore.online = true;
	QUnit.equal(store.query({i: 1}).value().asArray().length, 10);
	QUnit.equal(store.query({j: 0}).value().asArray().length, 5);
	QUnit.equal(remoteStore.query().value().asArray().length, 50);
	// Insert locally
	store.insert({i: 5, j: 0});
	QUnit.equal(remoteStore.query().value().asArray().length, 51);
	// Offline insert should fail
	remoteStore.online = false;
	store.insert({i: 5, j: 1}).success(function () {
		ok(false, "Insert has to fail");
	});
});


test("test partial stores, pre write strategy, no watchers", function() {
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
	QUnit.equal(remoteStore.query().value().asArray().length, 51);
	remoteStore.online = false;
	QUnit.equal(store.query().value().asArray().length, 1);
	store.insert({i: 5, j: 1});
	QUnit.equal(store.query().value().asArray().length, 1);
	remoteStore.online = true;
	QUnit.equal(remoteStore.query().value().asArray().length, 51);
});



test("test partial stores, commit write strategy, no watchers", function() {
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
	QUnit.equal(remoteStore.query().value().asArray().length, 50);
	store.writeStrategy.push();
	QUnit.equal(remoteStore.query().value().asArray().length, 51);
	QUnit.equal(remoteStore.query({i: 5}).value().asArray().length, 1);
	QUnit.equal(store.query({i: 5}).value().asArray().length, 1);
	remoteStore.insert({i: 5, j: 1});
	QUnit.equal(remoteStore.query({i: 5}).value().asArray().length, 2);
	QUnit.equal(store.query({i: 5}).value().asArray().length, 1);
});



test("test partial stores, commit write strategy, with watchers", function() {
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
		watcher: remoteWatcher
	});
	store.insert({i: 5, j: 0});
	QUnit.equal(remoteStore.query().value().asArray().length, 50);
	store.writeStrategy.push();
	QUnit.equal(remoteStore.query().value().asArray().length, 51);
	QUnit.equal(remoteStore.query({i: 5}).value().asArray().length, 1);
	QUnit.equal(store.query({i: 5}).value().asArray().length, 1);
	remoteStore.insert({i: 5, j: 1});
	QUnit.equal(remoteStore.query({i: 5}).value().asArray().length, 2);
	remoteWatcher.poll();
	QUnit.equal(store.query({i: 5}).value().asArray().length, 1);
	remoteWatcher.watchInsert({i: 5}, {});
	remoteStore.insert({i: 5, j: 2});
	QUnit.equal(store.query({i: 5}).value().asArray().length, 1);
	remoteWatcher.poll();
	QUnit.equal(store.query({i: 5}).value().asArray().length, 3);
});
