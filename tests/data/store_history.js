QUnit.test("test store history no combine", function (assert) {
	var sourceStore = new BetaJS.Data.Stores.MemoryStore();
	var historyStore = new BetaJS.Data.Stores.MemoryStore();
	var storeHistory = new BetaJS.Data.Stores.StoreHistory(sourceStore, historyStore, {
	});
	var row = sourceStore.insert({foobar: 1234}).value();
	assert.equal(historyStore.count().value(), 1);
	sourceStore.update(row.id, {foobar: 2345});
    assert.equal(historyStore.count().value(), 2);
});

QUnit.test("test store history combine insert and update", function (assert) {
    var sourceStore = new BetaJS.Data.Stores.MemoryStore();
    var historyStore = new BetaJS.Data.Stores.MemoryStore();
    var storeHistory = new BetaJS.Data.Stores.StoreHistory(sourceStore, historyStore, {
        combine_insert_update: true,
        combine_update_update: true
    });
    var row = sourceStore.insert({foobar: 1234}).value();
    assert.equal(historyStore.count().value(), 1);
    sourceStore.update(row.id, {foobar: 2345});
    assert.equal(historyStore.count().value(), 1);
});