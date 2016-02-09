test("client server with different ids", function () {
	
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
			itemRefreshTime: 0,
			itemAccessTime: 0,
			queryRefreshTime: 0,
			queryAccessTime: 0
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
		watcher: client.combined_watcher,
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
		auto: true
	});

	// TODO: Tests
	
	ok(true);
});