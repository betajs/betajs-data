test("client server cache with different ids", function () {
	
	var transport = {
		receiver_x: new BetaJS.Channels.Receiver(),
		receiver_y: new BetaJS.Channels.Receiver()
	};
	transport.sender_x = new BetaJS.Channels.SimulatorSender(new BetaJS.Channels.ReceiverSender(transport.receiver_y));
	transport.sender_y = new BetaJS.Channels.SimulatorSender(new BetaJS.Channels.ReceiverSender(transport.receiver_x));

	var server = {
		store: new BetaJS.Data.Stores.MemoryStore({
			id_key: "server_id"
		})	
	};
	server.local_watcher = new BetaJS.Data.Stores.Watchers.LocalWatcher(server.store);
	server.producer_watcher = new BetaJS.Data.Stores.Watchers.ProducerWatcher(transport.sender_y, transport.receiver_y, server.local_watcher);
	
	for (var i = 1; i <= 10; ++i)
		for (var j = 1; j <= 10; ++j)
			server.store.insert({first_name: "First-" + j, last_name: "Last-" + i});
	
	transport.server_store = new BetaJS.Data.Stores.SimulatorStore(server.store);
	
	var client = {
		client_item_cache: new BetaJS.Data.Stores.MemoryStore({
			id_key: "client_id"
		}),
		client_query_cache: new BetaJS.Data.Stores.MemoryStore({
			id_key: "client_query_id"
		}),
		cache_strategy: new BetaJS.Data.Stores.CacheStrategies.ExpiryCacheStrategy({
			itemRefreshTime: -1,
			itemAccessTime: -1,
			queryRefreshTime: -1,
			queryAccessTime: -1
		}),
		poll_watcher: new BetaJS.Data.Stores.Watchers.PollWatcher(transport.server_store),
		consumer_watcher: new BetaJS.Data.Stores.Watchers.ConsumerWatcher(transport.sender_x, transport.receiver_x)
	};
	client.combined_watcher = new BetaJS.Data.Stores.Watchers.ListWatcher(transport.server_store, [
        client.poll_watcher,
        client.consumer_watcher
    ]);
	client.store = new BetaJS.Data.Stores.CachedStore(transport.server_store, {
		itemCache: client.client_item_cache,
		queryCache: client.client_query_cache,
		cacheStrategy: client.cache_strategy,
		watcher: client.combined_watcher
	});
	client.collection = new BetaJS.Data.Collections.StoreQueryCollection(client.store, {
		last_name: "Last-1"
	}, {
		active: true,
		auto: true,
		limit: 1000
	});

	QUnit.equal(client.collection.count(), 10);
	QUnit.equal(client.client_item_cache.query({last_name: "Last-1"}).value().asArray().length, 10);
	client.store.cleanup();
	QUnit.equal(client.collection.count(), 10);
	QUnit.equal(client.client_item_cache.query().value().asArray().length, 0);
});




test("client server partial with different ids", function () {
	
	var transport = {
		receiver_x: new BetaJS.Channels.Receiver(),
		receiver_y: new BetaJS.Channels.Receiver()
	};
	transport.sender_x = new BetaJS.Channels.SimulatorSender(new BetaJS.Channels.ReceiverSender(transport.receiver_y));
	transport.sender_y = new BetaJS.Channels.SimulatorSender(new BetaJS.Channels.ReceiverSender(transport.receiver_x));

	var server = {
		store: new BetaJS.Data.Stores.MemoryStore({
			id_key: "server_id"
		})	
	};
	server.local_watcher = new BetaJS.Data.Stores.Watchers.LocalWatcher(server.store);
	server.producer_watcher = new BetaJS.Data.Stores.Watchers.ProducerWatcher(transport.sender_y, transport.receiver_y, server.local_watcher);
	
	for (var i = 1; i <= 10; ++i)
		for (var j = 1; j <= 10; ++j)
			server.store.insert({first_name: "First-" + j, last_name: "Last-" + i});
	
	transport.server_store = new BetaJS.Data.Stores.SimulatorStore(server.store);
	
	var client = {
		client_item_cache: new BetaJS.Data.Stores.MemoryStore({
			id_key: "client_id"
		}),
		client_query_cache: new BetaJS.Data.Stores.MemoryStore({
			id_key: "client_query_id"
		}),
		cache_strategy: new BetaJS.Data.Stores.CacheStrategies.ExpiryCacheStrategy({
			itemRefreshTime: -1,
			itemAccessTime: -1,
			queryRefreshTime: -1,
			queryAccessTime: -1
		}),
		write_strategy: new BetaJS.Data.Stores.PartialStoreWriteStrategies.CommitStrategy(),	
		poll_watcher: new BetaJS.Data.Stores.Watchers.PollWatcher(transport.server_store),
		consumer_watcher: new BetaJS.Data.Stores.Watchers.ConsumerWatcher(transport.sender_x, transport.receiver_x)
	};
	client.combined_watcher = new BetaJS.Data.Stores.Watchers.ListWatcher(transport.server_store, [
        client.poll_watcher,
        client.consumer_watcher
    ]);
	client.store = new BetaJS.Data.Stores.PartialStore(transport.server_store, {
		cacheStrategy: client.cache_strategy,
		writeStrategy: client.write_strategy,
		remoteWatcher: client.combined_watcher,
		itemCache: client.client_item_cache,
		queryCache: client.client_query_cache,
		suppAttrs: {
			local_attr: "foobar"
		}
	});
	client.collection = new BetaJS.Data.Collections.StoreQueryCollection(client.store, {
		last_name: "Last-1"
	}, {
		active: true,
		auto: true,
		limit: 1000
	});

	/*
	 * Server --> Client (Query + Insert)
	 * 
	 */
	// Initial Size
	QUnit.equal(client.collection.count(), 10);
	// Server gets an email
	var server_inserted_item_11 = server.store.insert({first_name: "First-11", last_name: "Last-1"}).value();
	// Client should receive the email automatically via consumer watcher.
	QUnit.equal(client.collection.count(), 11);
	// Let's also poll.
	client.poll_watcher.poll();
	// And make sure we don't get more.
	QUnit.equal(client.collection.count(), 11);
	// Now we interrupt the transport handler
	transport.sender_y.online = false;
	// Server gets an email
	var server_inserted_item_12 = server.store.insert({first_name: "First-12", last_name: "Last-1"}).value();
	// Client should not receive the email via consumer watcher.
	QUnit.equal(client.collection.count(), 11);
	// Let's poll now.
	client.poll_watcher.poll();
	// Now we should have the email
	QUnit.equal(client.collection.count(), 12);
	// Restore transport handler
	transport.sender_y.online = true;
	// We should have 102 emails on the server now
	QUnit.equal(server.store.query().value().asArray().length, 102);
	// Syncing the client to the server shouldn't change this.
	client.write_strategy.push();
	QUnit.equal(server.store.query().value().asArray().length, 102);
	
	/*
	 * Client --> Server (Insert)
	 * 
	 */
	// Create an email on the client site.
	var client_inserted_item_13 = client.store.insert({first_name: "First-13", last_name: "Last-1"}).value();
	// Now we should have the email
	QUnit.equal(client.collection.count(), 13);
	// But not on the server side.
	QUnit.equal(server.store.query().value().asArray().length, 102);
	// We should after syncinc.
	client.write_strategy.push();
	QUnit.equal(server.store.query().value().asArray().length, 103);
	// Pulling it back should not change anything.
	client.poll_watcher.poll();
	QUnit.equal(client.collection.count(), 13);
	// Create another email on the client site.
	var client_inserted_item_14 = client.store.insert({first_name: "First-14", last_name: "Last-1"}).value();
	QUnit.equal(client.collection.count(), 14);
	// Let's break the connection
	transport.server_store.online = false;
	// Syncing it should not be successful.
	client.write_strategy.push();
	QUnit.equal(server.store.query().value().asArray().length, 103);
	// Go online again.
	transport.server_store.online = true;
	// Let's try again.
	client.write_strategy.push();
	QUnit.equal(server.store.query().value().asArray().length, 104);
	// Client side should not have changed.
	QUnit.equal(client.collection.count(), 14);
	
	/*
	 * Server --> Client (Delete)
	 * 
	 */
	
	// Delete on the server
	server.store.remove(server_inserted_item_11.server_id);
	// It should be gone on the server side
	QUnit.equal(server.store.query().value().asArray().length, 103);
	// It should also be gone on the client side.
	QUnit.equal(client.collection.count(), 13);
	
	/*
	 * Client --> Server (Delete)
	 * 
	 */
	
	// Delete on the client
	client.store.remove(client_inserted_item_14.client_id);
	// It should be gone on the client side.
	QUnit.equal(client.collection.count(), 12);
	// It should still exist on the server side.
	QUnit.equal(server.store.query().value().asArray().length, 103);
	// Let's break the connection
	transport.server_store.online = false;
	// Syncing it should not be successful.
	client.write_strategy.push();
	QUnit.equal(server.store.query().value().asArray().length, 103);
	// Go online again.
	transport.server_store.online = true;
	// Let's try again.
	client.write_strategy.push();
	QUnit.equal(server.store.query().value().asArray().length, 102);
	// It should be gone on the client side.
	QUnit.equal(client.collection.count(), 12);
	
	
	/*
	 * Server --> Client (Update)
	 * 
	 */
	// Update first name on the server.
	server.store.update(server_inserted_item_12.server_id, {
		"first_name": "First-12-B"
	});
	// Should be in the client store
	QUnit.equal(client.store.query({"first_name": "First-12-B"}).value().asArray().length, 1);
	// It should be updated on the client side
	QUnit.equal(client.collection.getByIndex(10).get("first_name"), "First-12-B");
	
	
	/*
	 * Client --> Server (Update) 
	 * 
	 */
	client.store.update(client_inserted_item_13.client_id, {
		"first_name": "First-13-B"
	});
	client.write_strategy.push();
	var server_items = server.store.query({"first_name": "First-13-B"}).value().asArray(); 
	QUnit.equal(server_items.length, 1);
	QUnit.equal(!server_items[0].local_attr, true);
	
	// Release resources
	client.collection.destroy();
	
});