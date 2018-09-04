QUnit.test("channel store test", function (assert) {
    var baseStore = new BetaJS.Data.Stores.MemoryStore();

    var channel1 = BetaJS.Channels.ReceiverSender.createPair(true, 1, true);
    var channel2 = BetaJS.Channels.ReceiverSender.createPair(true, 1, true);

    var clientStore = new BetaJS.Data.Stores.ChannelClientStore(channel1.sender, channel2.receiver);
    var serverStore = new BetaJS.Data.Stores.ChannelServerStore(channel2.sender, channel1.receiver, baseStore);

    var done = assert.async();

    // Insert Client
    clientStore.insert({foo: "bar"}).success(function (item) {
        assert.equal(item.foo, "bar");

        // Get Server
        baseStore.get(item.id).success(function (item2) {
            assert.equal(item2.foo, "bar");

            // Get Client
            clientStore.get(item.id).success(function (item3) {
                assert.equal(item3.foo, "bar");

                // Update Client
                clientStore.update(item.id, {foo: "baz"}).success(function (diff) {
                    assert.equal(diff.foo, "baz");

                    // Get Server
                    baseStore.get(item.id).success(function (item2) {
                        assert.equal(item2.foo, "baz");

                        // Get Client
                        clientStore.get(item.id).success(function (item3) {
                            assert.equal(item3.foo, "baz");

                            // Query Client
                            clientStore.query().success(function (items) {
                                assert.equal(items.next().foo, "baz");
                                assert.equal(items.hasNext(), false);

                                // Remove Client
                                clientStore.remove(item.id).success(function () {

                                    // Get Server
                                    baseStore.get(item.id).success(function (item2) {
                                        assert.equal(item2, null);

                                        // Get Client
                                        clientStore.get(item.id).success(function (item3) {
                                            assert.equal(item3, null);

                                            // Insert Server
                                            var item = baseStore.insert({bar: "foo"}).value();
                                            clientStore.once("insert", function (item2) {
                                                assert.equal(item2.bar, "foo");

                                                // Update Server
                                                baseStore.update(item.id, {bar: "baz"});
                                                clientStore.once("update", function (item2) {
                                                    assert.equal(item.bar, "baz");

                                                    // Delete Server
                                                    baseStore.remove(item.id);
                                                    clientStore.once("remove", function (id) {
                                                        assert.equal(item.id, id);

                                                        serverStore.destroy();
                                                        clientStore.destroy();
                                                        done();
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});

