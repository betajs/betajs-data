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
	
	var list = [];
	first.itemIterate("Louid", false, function (key, item) {
		list.push(item);
	});
	QUnit.deepEqual(list, [huey, donald, dewey, daisy]);

	var list = [];
	last.itemIterate("E", true, function (key, item) {
		list.push(item);
	});
	QUnit.deepEqual(list, [scrooge, ludwig]);
});

