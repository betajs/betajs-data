test("test indices query", function() {
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
	QUnit.deepEqual(list, [louie, ludwig, scrooge]);
	
	list = [];
	first.itemIterate("Louid", false, function (key, item) {
		list.push(item);
	});
	QUnit.deepEqual(list, [huey, donald, dewey, daisy]);

	list = [];
	last.itemIterate("E", true, function (key, item) {
		list.push(item);
	});
	QUnit.deepEqual(list, [scrooge, ludwig]);
});


test("test index performance", function () {
	var store = new BetaJS.Data.Stores.MemoryStore();
		
	for (var i = 1; i <= 2000; ++i)
		store.insert({data: i});
	store.query({"data": 1000}).success(function (iter) {
		QUnit.equal(iter.asArray().length, 1);
	});
	store.query({"data": {"$eq": 1000}}).success(function (iter) {
		QUnit.equal(iter.asArray().length, 1);
	});
	
	store.indices.data = new BetaJS.Data.Stores.MemoryIndex(store, "data");
	
	store.query({"data": {"$eq": 1000}}).success(function (iter) {
		QUnit.equal(iter.asArray().length, 1);
	});

});