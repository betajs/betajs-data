QUnit.test("test indices query", function (assert) {
	var store = new BetaJS.Data.Stores.MemoryStore();
	var first = new BetaJS.Data.Stores.MemoryIndex(store, "first");
	var last = new BetaJS.Data.Stores.MemoryIndex(store, "last");
	var donald = store.insert({first: "Donald", last: "Duck"}).value();
	var daisy = store.insert({first: "Daisy", last: "Duck"}).value();
	var huey = store.insert({first: "Huey", last: "Duck"}).value();
	var dewey = store.insert({first: "Dewey", last: "Duck"}).value();
	var louie = store.insert({first: "Louie", last: "Duck"}).value();
	var scrooge = store.insert({first: "Scrooge", last: "McDuck"}).value();
	var ludwig = store.insert({first: "Ludwig", last: "Von Drake"}).value();
	
	var list = [];
	first.itemIterate("Louie", true, function (key, item) {
		list.push(item);
	});
	assert.deepEqual(list, [louie, ludwig, scrooge]);
	
	list = [];
	first.itemIterate("Louid", false, function (key, item) {
		list.push(item);
	});
	assert.deepEqual(list, [huey, donald, dewey, daisy]);

	list = [];
	last.itemIterate("E", true, function (key, item) {
		list.push(item);
	});
	assert.deepEqual(list, [scrooge, ludwig]);
});


QUnit.test("test index performance", function (assert) {
	var store = new BetaJS.Data.Stores.MemoryStore();
		
	for (var i = 1; i <= 2000; ++i)
		store.insert({data: i});
	store.query({"data": 1000}).success(function (iter) {
		assert.equal(iter.asArray().length, 1);
	});
	store.query({"data": {"$eq": 1000}}).success(function (iter) {
		assert.equal(iter.asArray().length, 1);
	});
	
	store.indices.data = new BetaJS.Data.Stores.MemoryIndex(store, "data");
	
	store.query({"data": {"$eq": 1000}}).success(function (iter) {
		assert.equal(iter.asArray().length, 1);
	});

});

QUnit.test("test index queries x", function (assert) {
	var store = new BetaJS.Data.Stores.MemoryStore();
	store.indices.j = new BetaJS.Data.Stores.MemoryIndex(store, "j");
	for (var i = 0; i < 100; ++i)
		for (var j = 0; j < 100; ++j)
			store.insert({i:i,j:j});
	assert.equal(store.query({j: 50}).value().asArray().length, 100);
	assert.equal(store.query({j: {"$eq": 50}}).value().asArray().length, 100);
});

QUnit.test("test index queries", function (assert) {
	var store = new BetaJS.Data.Stores.MemoryStore();
	store.indices.i = new BetaJS.Data.Stores.MemoryIndex(store, "i");
	var c = 4;
	for (var i = 0; i < c; ++i)
		for (var j = 0; j < c; ++j)
			store.insert({i:i,j:j});

	for (i = 0; i < c; ++i) {
		assert.equal(store.query({}, {skip: i * c, limit: c, sort: {i: -1}}).value().asArray().length, c, i);
	}
});
