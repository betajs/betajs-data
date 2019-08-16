QUnit.test("test cached stores with same id", function (assert) {
	var remoteStore = new BetaJS.Data.Stores.MemoryStore({id_key: "tassertoken"});
	for (var i = 0; i <= 4; ++i)
		for (var j = 0; j <= 9; ++j)
			remoteStore.insert({i:i,j:j});
	var itemCache = new BetaJS.Data.Stores.MemoryStore({id_key: "tassertoken"});
	var queryCache = new BetaJS.Data.Stores.MemoryStore();
	var globalTime = 0;
	var strategy = new BetaJS.Data.Stores.CacheStrategies.ExpiryCacheStrategy({
		itemRefreshTime: 20,
		itemAccessTime: 10,
		queryRefreshTime: 20,
		queryAccessTime: 10,
		now: function () {
			return globalTime;
		}
	});
	var cachedStore = new BetaJS.Data.Stores.CachedStore(remoteStore, {
		itemCache: itemCache,
		queryCache: queryCache,
		cacheStrategy: strategy
	});
	assert.equal(itemCache.query().value().asArray().length, 0);
	assert.equal(cachedStore.query({i: 1}).value().asArray().length, 10);
	assert.equal(itemCache.query().value().asArray().length, 10);
	globalTime = 1;
	assert.equal(itemCache.query({j: 1}).value().asArray().length, 1);
	assert.equal(cachedStore.query({j: 1}).value().asArray().length, 5);
	assert.equal(itemCache.query().value().asArray().length, 14);
	cachedStore.cleanup();
	assert.equal(itemCache.query().value().asArray().length, 14);
	globalTime = 11;
	cachedStore.cleanup();
	assert.equal(itemCache.query().value().asArray().length, 5);
});


QUnit.test("test cached stores with different ids", function (assert) {
	var remoteStore = new BetaJS.Data.Stores.MemoryStore({id_key: "tassertoken"});
	for (var i = 0; i <= 4; ++i)
		for (var j = 0; j <= 9; ++j)
			remoteStore.insert({i:i,j:j});
	var itemCache = new BetaJS.Data.Stores.MemoryStore({id_key: "id"});
	var queryCache = new BetaJS.Data.Stores.MemoryStore();
	var globalTime = 0;
	var strategy = new BetaJS.Data.Stores.CacheStrategies.ExpiryCacheStrategy({
		itemRefreshTime: 20,
		itemAccessTime: 10,
		queryRefreshTime: 20,
		queryAccessTime: 10,
		now: function () {
			return globalTime;
		}
	});
	var cachedStore = new BetaJS.Data.Stores.CachedStore(remoteStore, {
		itemCache: itemCache,
		queryCache: queryCache,
		cacheStrategy: strategy
	});
	assert.equal(itemCache.query().value().asArray().length, 0);
	assert.equal(cachedStore.query({i: 1}).value().asArray().length, 10);
	assert.equal(itemCache.query().value().asArray().length, 10);
	globalTime = 1;
	assert.equal(itemCache.query({j: 1}).value().asArray().length, 1);
	assert.equal(cachedStore.query({j: 1}).value().asArray().length, 5);
	assert.equal(itemCache.query().value().asArray().length, 14);
	cachedStore.cleanup();
	assert.equal(itemCache.query().value().asArray().length, 14);
	globalTime = 11;
	cachedStore.cleanup();
	assert.equal(itemCache.query().value().asArray().length, 5);
});


QUnit.test("test cached stores with supplementary attrs", function (assert) {
	var remoteStore = new BetaJS.Data.Stores.MemoryStore({id_key: "tassertoken"});
	for (var i = 0; i <= 4; ++i)
		for (var j = 0; j <= 9; ++j)
			remoteStore.insert({i:i,j:j});
	var itemCache = new BetaJS.Data.Stores.MemoryStore({id_key: "tassertoken"});
	var queryCache = new BetaJS.Data.Stores.MemoryStore();
	var globalTime = 0;
	var strategy = new BetaJS.Data.Stores.CacheStrategies.ExpiryCacheStrategy({
		itemRefreshTime: 20,
		itemAccessTime: 10,
		queryRefreshTime: 20,
		queryAccessTime: 10,
		now: function () {
			return globalTime;
		}
	});
	var cachedStore = new BetaJS.Data.Stores.CachedStore(remoteStore, {
		itemCache: itemCache,
		queryCache: queryCache,
		cacheStrategy: strategy,
		suppAttrs: {
			adder: "foobar"
		}
	});
	assert.equal(itemCache.query().value().asArray().length, 0);
	assert.equal(cachedStore.query({i: 1}).value().asArray().length, 10);
	assert.equal(itemCache.query().value().asArray().length, 10);
	globalTime = 1;
	assert.equal(itemCache.query({j: 1}).value().asArray().length, 1);
	assert.equal(cachedStore.query({j: 1}).value().asArray().length, 5);
	assert.equal(itemCache.query().value().asArray().length, 14);
	cachedStore.cleanup();
	assert.equal(itemCache.query().value().asArray().length, 14);
	globalTime = 11;
	cachedStore.cleanup();
	assert.equal(itemCache.query().value().asArray().length, 5);
	assert.equal(itemCache.query().value().next().adder, "foobar");
	assert.equal(remoteStore.query().value().next().adder, undefined);
	assert.equal(remoteStore.query({adder: "foobar"}).value().asArray().length, 0);
	assert.equal(itemCache.query({adder: "foobar"}).value().asArray().length, 5);
});
