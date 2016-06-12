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
	stop();
	store.insert({x: 5}).success(function (object) {
		ok(!!object.id);
		QUnit.equal(object.x, 5);
		var updated = false;
		store.update(object.id, {
			y: 7
		}).success(function (row) {
			updated = true;
			QUnit.equal(row.y, 7);
			QUnit.equal(this.z, 3);
			start();
		}, {z: 3});
		ok(updated);
	});
});



test("test store update async 2", function() {
	var store = new BetaJS.Data.Stores.AsyncStore(new BetaJS.Data.Stores.MemoryStore());
	stop();
	store.insert({x: 5}).success(function (object) {
		ok(!!object.id, "has object id");
		QUnit.equal(object.x, 5, "x has right value");
		var updated = false;
		store.update(object.id, {
			y: 7
		}).success(function (row) {
			updated = true;
			QUnit.equal(row.y, 7, "updated value");
			QUnit.equal(this.z, 3, "context okay");
			start();
		}, {z: 3});
	});
});
