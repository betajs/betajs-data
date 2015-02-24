test("test store update sync", function() {
	var store = new BetaJS.Data.Stores.MemoryStore();
	var object = store.insert({x: 5}).value();
	ok(!!object.id);
	QUnit.equal(object.x, 5);
	store.update(object.id, {y: 7});
	QUnit.equal(object.y, 7);
});


test("test store update async", function() {
	var store = new BetaJS.Data.Stores.MemoryStore();
	var object = store.insert({x: 5}).value();
	ok(!!object.id);
	QUnit.equal(object.x, 5);
	var updated = false;
	stop();
	store.update(object.id, {
		y: 7
	}).success(function (row) {
		updated = true;
		start();
		QUnit.equal(row.y, 7);
		QUnit.equal(this.z, 3);
	}, {z: 3});
	ok(updated);
});


test("test cached store", function () {
    var base = new BetaJS.Data.Stores.MemoryStore();
    for (var i = 1; i <= 5; ++i)
        for (var j = 1; j <= 5; ++j)
            base.insert({i: i, j: j});
    var dual = new BetaJS.Data.Stores.CachedStore(base);
    var hit = 0;
    var miss = 0;
    var invalidate = 0;
    dual.on("invalidate_query", function () {
       invalidate++; 
    });
    dual.cache().on("query_hit", function () {
       hit++; 
    });
    dual.cache().on("query_miss", function () {
       miss++; 
    });
    var result = dual.query({}).value().asArray();
    var result2 = dual.query({}).value().asArray();
    QUnit.equal(result.length, result2.length);
    QUnit.equal(hit, 1);
    QUnit.equal(miss, 1);
    QUnit.equal(invalidate, 0);
});


test("test cached store with store as query model", function () {
    var base = new BetaJS.Data.Stores.MemoryStore();
    for (var i = 1; i <= 5; ++i)
        for (var j = 1; j <= 5; ++j)
            base.insert({i: i, j: j});
    var query_store = new BetaJS.Data.Stores.MemoryStore();
    var cache_store = new BetaJS.Data.Stores.MemoryStore();
    var dual = new BetaJS.Data.Stores.CachedStore(base, {
        cache_store: cache_store,
        cache_query_model: new BetaJS.Data.Queries.StoreQueryModel(query_store)
    });
    var hit = 0;
    var miss = 0;
    var invalidate = 0;
    dual.on("invalidate_query", function () {
       invalidate++; 
    });
    dual.cache().on("query_hit", function () {
       hit++; 
    });
    dual.cache().on("query_miss", function () {
       miss++; 
    });
    var result = dual.query({}).value().asArray();
    var result2 = dual.query({}).value().asArray();
    QUnit.equal(result.length, result2.length);
    QUnit.equal(hit, 1);
    QUnit.equal(miss, 1);
    dual.destroy();
    var dual = new BetaJS.Data.Stores.CachedStore(base, {
        cache_store: cache_store,
        cache_query_model: new BetaJS.Data.Queries.StoreQueryModel(query_store)
    });
    var result3 = dual.query({}).value().asArray();
    QUnit.equal(result.length, result3.length);
    QUnit.equal(hit, 2);
    QUnit.equal(miss, 1);
    QUnit.equal(invalidate, 0);
});


test("test cached store with store as query model and invalidation", function () {
    var base = new BetaJS.Data.Stores.MemoryStore();
    for (var i = 1; i <= 5; ++i)
        for (var j = 1; j <= 5; ++j)
            base.insert({i: i, j: j});
    var query_store = new BetaJS.Data.Stores.MemoryStore();
    var cache_store = new BetaJS.Data.Stores.MemoryStore();
    var dual = new BetaJS.Data.Stores.CachedStore(base, {
        cache_store: cache_store,
        cache_query_model: new BetaJS.Data.Queries.StoreQueryModel(query_store),
        invalidation: {
            reload_after_first_hit: true
        }
    });
    var hit = 0;
    var miss = 0;
    var invalidate = 0;
    dual.on("invalidate_query", function () {
       invalidate++; 
    });
    dual.cache().on("query_hit", function () {
       hit++;
    });
    dual.cache().on("query_miss", function () {
       miss++;
    });
    var result = dual.query({}).value().asArray();
    var result2 = dual.query({}).value().asArray();
    QUnit.equal(result.length, result2.length);
    QUnit.equal(hit, 1);
    QUnit.equal(miss, 1);
    QUnit.equal(invalidate, 0);
    dual.destroy();
    var dual = new BetaJS.Data.Stores.CachedStore(base, {
        cache_store: cache_store,
        cache_query_model: new BetaJS.Data.Queries.StoreQueryModel(query_store),
        invalidation: {
            reload_after_first_hit: true
        }
    });
    dual.on("invalidate_query", function () {
       invalidate++;
    });
    var result3 = dual.query({}).value().asArray();
    stop();
    BetaJS.Async.eventually(function () {
        QUnit.equal(result.length, result3.length);
        QUnit.equal(hit, 2);
        QUnit.equal(miss, 2);
        QUnit.equal(invalidate, 1);
        var result4 = dual.query({}).value().asArray();
        QUnit.equal(result.length, result4.length);
        QUnit.equal(hit, 3);
        QUnit.equal(miss, 2);
        QUnit.equal(invalidate, 1);
        start();
    });
});

