test("test store history no combine", function() {
	var sourceStore = new BetaJS.Data.Stores.MemoryStore();
	var historyStore = new BetaJS.Data.Stores.MemoryStore();
	var storeHistory = new BetaJS.Data.Stores.StoreHistory(sourceStore, historyStore, {
	});
	var row = sourceStore.insert({foobar: 1234}).value();
	QUnit.equal(historyStore.count().value(), 1);
	sourceStore.update(row.id, {foobar: 2345});
    QUnit.equal(historyStore.count().value(), 2);
});

test("test store history combine insert and update", function() {
    var sourceStore = new BetaJS.Data.Stores.MemoryStore();
    var historyStore = new BetaJS.Data.Stores.MemoryStore();
    var storeHistory = new BetaJS.Data.Stores.StoreHistory(sourceStore, historyStore, {
        combine_insert_update: true,
        combine_update_update: true
    });
    var row = sourceStore.insert({foobar: 1234}).value();
    QUnit.equal(historyStore.count().value(), 1);
    sourceStore.update(row.id, {foobar: 2345});
    QUnit.equal(historyStore.count().value(), 1);
});