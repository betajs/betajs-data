test("test watcher items read store polling", function() {
	var store = new BetaJS.Data.Stores.MemoryStore();
	var counts = {
		insert: 0,
		update: 0,
		remove: 0
	};
	var watcherItems = new BetaJS.Data.Stores.Watchers.PollWatcher(store);
	watcherItems.on("insert", function () {
		counts.insert++;
	});
	watcherItems.on("update", function () {
		counts.update++;
	});
	watcherItems.on("remove", function () {
		counts.remove++;
	});
	var item1_id = store.insert({"first":"abc"}).value().id;
	var item2_id = store.insert({"first":"def"}).value().id;
	var item3_id = store.insert({"first":"geh"}).value().id;
	watcherItems.poll();
	QUnit.deepEqual(counts, {insert: 0, update: 0, remove: 0});
	
	watcherItems.watchItem(item1_id);
	watcherItems.watchItem(item2_id);
	watcherItems.poll();

	store.update(item3_id, {"first": "ijk"});
	watcherItems.poll();
	QUnit.deepEqual(counts, {insert: 0, update: 0, remove: 0});

	store.update(item1_id, {"first": "mno"});
	QUnit.deepEqual(counts, {insert: 0, update: 0, remove: 0});	
	watcherItems.poll();
	QUnit.deepEqual(counts, {insert: 0, update: 1, remove: 0});

	store.remove(item2_id);
	QUnit.deepEqual(counts, {insert: 0, update: 1, remove: 0});
	watcherItems.poll();
	QUnit.deepEqual(counts, {insert: 0, update: 1, remove: 1});
	watcherItems.unwatchItem(item2_id);
	
	watcherItems.watchInsert({"first": "foobar"});
	watcherItems.poll();
	QUnit.deepEqual(counts, {insert: 0, update: 1, remove: 1});
	store.insert({"first":"testtest"});
	watcherItems.poll();
	QUnit.deepEqual(counts, {insert: 0, update: 1, remove: 1});
	store.insert({"first":"foobar"});
	watcherItems.poll();
	QUnit.deepEqual(counts, {insert: 1, update: 1, remove: 1});
	
});



test("test watcher items read store local", function() {
	var store = new BetaJS.Data.Stores.MemoryStore();
	var counts = {
		update: 0,
		remove: 0
	};
	var watcherItems = new BetaJS.Data.Stores.Watchers.LocalWatcher(store);
	watcherItems.on("update", function () {
		counts.update++;
	});
	watcherItems.on("remove", function () {
		counts.remove++;
	});
	var item1_id = store.insert({"first":"abc"}).value().id;
	var item2_id = store.insert({"first":"def"}).value().id;
	var item3_id = store.insert({"first":"geh"}).value().id;
	QUnit.deepEqual(counts, {update: 0, remove: 0});
	
	watcherItems.watchItem(item1_id);
	watcherItems.watchItem(item2_id);

	store.update(item3_id, {"first": "ijk"});
	QUnit.deepEqual(counts, {update: 0, remove: 0});

	store.update(item1_id, {"first": "mno"});
	QUnit.deepEqual(counts, {update: 1, remove: 0});

	store.remove(item2_id);
	QUnit.deepEqual(counts, {update: 1, remove: 1});
});


test("test watcher items read store push", function() {
	var store = new BetaJS.Data.Stores.MemoryStore();
	var receiver_x = new BetaJS.Channels.Receiver();
	var receiver_y = new BetaJS.Channels.Receiver();
	var sender_x = new BetaJS.Channels.ReceiverSender(receiver_y);
	var sender_y = new BetaJS.Channels.ReceiverSender(receiver_x);
	var counts = {
		update: 0,
		remove: 0
	};
	var localwatcher = new BetaJS.Data.Stores.Watchers.LocalWatcher(store);
	var watcherItems = new BetaJS.Data.Stores.Watchers.ConsumerWatcher(sender_x, receiver_x);
	var watcherItemsProcuder = new BetaJS.Data.Stores.Watchers.ProducerWatcher(sender_y, receiver_y, localwatcher);
	watcherItems.on("update", function () {
		counts.update++;
	});
	watcherItems.on("remove", function () {
		counts.remove++;
	});
	var item1_id = store.insert({"first":"abc"}).value().id;
	var item2_id = store.insert({"first":"def"}).value().id;
	var item3_id = store.insert({"first":"geh"}).value().id;
	QUnit.deepEqual(counts, {update: 0, remove: 0});
	
	watcherItems.watchItem(item1_id);
	watcherItems.watchItem(item2_id);

	store.update(item3_id, {"first": "ijk"});
	QUnit.deepEqual(counts, {update: 0, remove: 0});

	store.update(item1_id, {"first": "mno"});
	QUnit.deepEqual(counts, {update: 1, remove: 0});

	store.remove(item2_id);
	QUnit.deepEqual(counts, {update: 1, remove: 1});
});
