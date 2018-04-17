QUnit.test("test collection", function (assert) {
	var Model = BetaJS.Data.Modelling.Model.extend("Model", {}, {
		_initializeScheme: function () {
			var scheme = this._inherited(Model, "_initializeScheme");
			scheme.test = {
				type: "string",
				index: true
			};
			return scheme;
		}
	});
	var table = new BetaJS.Data.Modelling.Table(new BetaJS.Data.Stores.MemoryStore(), Model, {});
	var model0 = table.newModel({test: "abc"});
	model0.save();
	var coll = new BetaJS.Data.Collections.TableQueryCollection(table, {test: "abc"}, {
		active: true,
		auto: true
	});
	assert.equal(coll.getByIndex(0).get("test"), "abc");
	assert.equal(coll.count(), 1);
	model0.remove();
	assert.equal(coll.count(), 0);
	var adder = 0;
	var remover = 0;
	coll.on("add", function () {
		adder++;
	});
	coll.on("remove", function () {
		remover++;
	});
	assert.equal(adder, 0);
	var model1 = table.newModel({test: "abc"});
	model1.save();
	assert.equal(adder, 1);
	var model2 = table.newModel({test: "def"});
	model2.save();
	assert.equal(adder, 1);
	model2.update({test: "abc"});
	assert.equal(adder, 2);
	assert.equal(remover, 0);
	model1.update({test: "def"});
	assert.equal(adder, 2);
	assert.equal(remover, 1);
	model2.remove();
	assert.equal(adder, 2);
	assert.equal(remover, 2);
	model1.remove();
	assert.equal(adder, 2);
	assert.equal(remover, 2);
});


QUnit.test("test query collection", function (assert) {
	var store = new BetaJS.Data.Stores.MemoryStore();
	for (var i = 1; i < 3; ++i)
		for (var j = 1; j < 3; ++j)
			for (var k = 1; k < 3; ++k)
				store.insert({i:i,j:j,k:k});
	var coll = new BetaJS.Data.Collections.StoreQueryCollection(store, {query: {i:1, j:1}, options: {sort: {k: -1}}}, {
		active: true,
		auto: true
	});
	coll.iterate(function (item) {
		item.set("marker", true);
	});
	assert.equal(coll.count(), 2);
	assert.equal(coll.getByIndex(0).get("k"), 2);
	coll.update({query: {i:1, k:1}});
	assert.equal(coll.count(), 2);
	var marker_count = 0;
	coll.iterate(function (item) {
		if (item.get("marker"))
			marker_count++;
	});
	assert.equal(marker_count, 1);
});


QUnit.test("test query collection pagination", function (assert) {
	var store = new BetaJS.Data.Stores.MemoryStore();
	for (var i = 0; i <= 4; ++i)
		for (var j = 0; j <= 9; ++j)
			store.insert({i:i,j:j});
	var coll = new BetaJS.Data.Collections.StoreQueryCollection(store, {}, {
		range: 10,
		auto: true,
		sort: {
			i: -1,
			j: 1
		}
	});
	var it = function () {
		return BetaJS.Objs.map(coll.iterator().asArray(), function (prop) {
			return prop.get("i") + "-" + prop.get("j");
		}).join(",");
	};
	assert.equal(coll.paginate_index(), 0);
	assert.equal(coll.getLimit(), 10);
	assert.equal(coll.getSkip(), 0);
	assert.deepEqual(it(), "4-0,4-1,4-2,4-3,4-4,4-5,4-6,4-7,4-8,4-9");
	coll.paginate_next();
	assert.equal(coll.paginate_index(), 1);
	assert.equal(coll.getLimit(), 10);
	assert.equal(coll.getSkip(), 10);
	assert.deepEqual(it(), "3-0,3-1,3-2,3-3,3-4,3-5,3-6,3-7,3-8,3-9");
	coll.paginate_next();
	assert.equal(coll.paginate_index(), 2);
	assert.equal(coll.getLimit(), 10);
	assert.equal(coll.getSkip(), 20);
	assert.deepEqual(it(), "2-0,2-1,2-2,2-3,2-4,2-5,2-6,2-7,2-8,2-9");
	coll.paginate_prev();
	assert.equal(coll.paginate_index(), 1);
	assert.equal(coll.getLimit(), 10);
	assert.equal(coll.getSkip(), 10);
	assert.deepEqual(it(), "3-0,3-1,3-2,3-3,3-4,3-5,3-6,3-7,3-8,3-9");
});


QUnit.test("test query collection increasing", function (assert) {
	var store = new BetaJS.Data.Stores.MemoryStore();
	for (var i = 0; i <= 4; ++i)
		for (var j = 0; j <= 9; ++j)
			store.insert({i:i,j:j});
	var coll = new BetaJS.Data.Collections.StoreQueryCollection(store, {}, {
		limit: 10,
		forward_steps: 10,
		auto: true,
		sort: {
			i: -1,
			j: 1
		}
	});
	var it = function () {
		return BetaJS.Objs.map(coll.iterator().asArray(), function (prop) {
			return prop.get("i") + "-" + prop.get("j");
		}).join(",");
	};
	assert.equal(coll.getLimit(), 10);
	assert.equal(coll.getSkip(), 0);
	assert.deepEqual(it(), "4-0,4-1,4-2,4-3,4-4,4-5,4-6,4-7,4-8,4-9");
	coll.increase_forwards();
	assert.deepEqual(it(), "4-0,4-1,4-2,4-3,4-4,4-5,4-6,4-7,4-8,4-9,3-0,3-1,3-2,3-3,3-4,3-5,3-6,3-7,3-8,3-9");
});






QUnit.test("test query collection increasing 2", function (assert) {
	var store = new BetaJS.Data.Stores.MemoryStore();
	// store.indices.i = new BetaJS.Data.Stores.MemoryIndex(store, "i");
	var c = 10;
	for (var i = 0; i < c; ++i)
		for (var j = 0; j < c; ++j)
			store.insert({i:i,j:j});
	var coll = new BetaJS.Data.Collections.StoreQueryCollection(store, {}, {
		limit: c,
		forward_steps: c,
		auto: true,
		sort: {
			i: -1,
			j: 1
		}
	});
	
	for (i = 0; i < c; ++i)
		coll.increase_forwards();
	assert.equal(coll.count(), c * c);
});



QUnit.test("test collection remove", function (assert) {
	var store = new BetaJS.Data.Stores.MemoryStore();
	store.insert({archived: true});
	var Model = BetaJS.Data.Modelling.Model.extend("Model", {}, {
		_initializeScheme: function () {
			var scheme = this._inherited(Model, "_initializeScheme");
			scheme.archived = {
				type: "boolean"
			};
			return scheme;
		}
	});
	var table = new BetaJS.Data.Modelling.Table(store, Model);
	var coll = new BetaJS.Data.Collections.TableQueryCollection(table, {archived: true}, {
		active: true,
		auto: true
	});
	assert.equal(coll.count(), 1);
	var model0 = coll.getByIndex(0);
	model0.set("archived", false);
	assert.equal(coll.count(), 0);
	assert.equal(model0.destroyed(), true);
});



QUnit.test("test query collection super increase", function (assert) {
    var store = new BetaJS.Data.Stores.MemoryStore();
    var c = 100;
    for (var i = 0; i < c; ++i)
            store.insert({i:i});
    var coll = new BetaJS.Data.Collections.StoreQueryCollection(store, {
    	"i": {
    		"$gte": 25,
			"$lt": 75
		}
	}, {
    	auto: true
	});

    assert.equal(coll.count(), 75-25);

    coll.rangeSuperQueryIncrease({
        "i": {
            "$gte": 25,
            "$lt": 95
        }
	});

    assert.equal(coll.count(), 95-25);
});




QUnit.test("test auto query collection with other queries", function (assert) {
    var store = new BetaJS.Data.Stores.MemoryStore();
    for (var i = 1; i < 5; ++i)
        for (var j = 1; j < 5; ++j)
            for (var k = 3; k < 5; ++k)
                store.insert({i:i,j:j,k:k});
    var coll = new BetaJS.Data.Collections.StoreQueryCollection(store, {query: {i:1, j:1}, options: {sort: {k: -1}, limit: 2}}, {
        active: true,
        auto: true,
		active_in_direction: true
    });
    assert.equal(coll.count(), 2);
    assert.equal(coll.getByIndex(0).get("k"), 4);
    assert.equal(coll.getByIndex(1).get("k"), 3);
    store.insert({i:1, j:1, k: 5});
    assert.equal(coll.count(), 3);
    assert.equal(coll.getByIndex(0).get("k"), 5);
    assert.equal(coll.getByIndex(1).get("k"), 4);
    assert.equal(coll.getByIndex(2).get("k"), 3);
    store.insert({i:1, j:1, k: 2});
    assert.equal(coll.count(), 3);
});



QUnit.test("bounds expansion", function (assert) {
    var store = new BetaJS.Data.Stores.MemoryStore();
    for (var i = 1; i < 50; ++i)
        for (var j = 1; j <= 5; ++j)
			store.insert({i:i,j:j});
    var coll = new BetaJS.Data.Collections.StoreQueryCollection(store, {query: {
		i: {
			$gte: 20,
			$lt: 30
		}
	}, options: {}}, {
        active: true,
        auto: true,
        bounds_attribute: "i"
    });
    assert.equal(coll.count(), (30 - 20) * 5);
    coll.bounds_forwards(40);
    assert.equal(coll.count(), (40 - 20) * 5);
});