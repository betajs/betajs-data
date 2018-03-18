QUnit.test("test store update sync", function (assert) {
	var store = new BetaJS.Data.Stores.MemoryStore();
	var object = store.insert({x: 5}).value();
	assert.ok(!!object.id);
	assert.equal(object.x, 5);
	store.update(object.id, {y: 7});
	assert.equal(object.y, 7);
});


QUnit.test("test store update async", function (assert) {
	var store = new BetaJS.Data.Stores.MemoryStore();
	store.insert({x: 5}).success(function (object) {
		assert.ok(!!object.id);
		assert.equal(object.x, 5);
		var updated = false;
		store.update(object.id, {
			y: 7
		}).success(function (row) {
			updated = true;
			assert.equal(row.y, 7);
			assert.equal(this.z, 3);
		}, {z: 3});
		assert.ok(updated);
	});
});



QUnit.test("test store update async 2", function (assert) {
	var store = new BetaJS.Data.Stores.AsyncStore(new BetaJS.Data.Stores.MemoryStore());
    var done = assert.async();
	store.insert({x: 5}).success(function (object) {
		assert.ok(!!object.id, "has object id");
		assert.equal(object.x, 5, "x has right value");
		var updated = false;
		store.update(object.id, {
			y: 7
		}).success(function (row) {
			updated = true;
			assert.equal(row.y, 7, "updated value");
			assert.equal(this.z, 3, "context assert.okay");
            done();
		}, {z: 3});
	});
});



QUnit.test("test store create get memory map store", function (assert) {
    var store = new BetaJS.Data.Stores.MemoryMapStore();
    var done = assert.async();
    store.insert({x: 5, id: 1521244505370}).success(function (object) {
        assert.equal(object.id, 1521244505370);
        assert.equal(object.x, 5);
        store.get(1521244505370).success(function (object) {
            assert.equal(object.id, 1521244505370);
            assert.equal(object.x, 5);
            done();
        }, {z: 3});
    });
});
