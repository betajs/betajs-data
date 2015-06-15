test("test cached stores", function() {
	var remoteStore = new BetaJS.Data.Stores.MemoryStore();
	for (var i = 0; i <= 4; ++i)
		for (var j = 0; j <= 9; ++j)
			remoteStore.insert({i:i,j:j});
	var itemCache = new BetaJS.Data.Stores.MemoryStore();
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
	QUnit.equal(itemCache.query().value().asArray().length, 0);
	QUnit.equal(cachedStore.query({i: 1}).value().asArray().length, 10);
	QUnit.equal(itemCache.query().value().asArray().length, 10);
	globalTime = 1;
	QUnit.equal(itemCache.query({j: 1}).value().asArray().length, 1);
	QUnit.equal(cachedStore.query({j: 1}).value().asArray().length, 5);
	QUnit.equal(itemCache.query().value().asArray().length, 14);
	cachedStore.cleanup();
	QUnit.equal(itemCache.query().value().asArray().length, 14);
	globalTime = 11;
	cachedStore.cleanup();
	QUnit.equal(itemCache.query().value().asArray().length, 5);
});
