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



