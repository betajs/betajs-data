Scoped.define("module:Stores.ChannelClientStore", [
    "module:Stores.Invokers.AbstractInvokerStore",
    "base:Channels.TransportChannel",
    "base:Functions"
], function (AbstractInvokerStore, TransportChannel, Functions, scoped) {
    return AbstractInvokerStore.extend({scoped: scoped}, function (inherited) {
        return {

            constructor: function (sender, receiver, options) {
                inherited.constructor.call(this, options);
                this.transport = this.auto_destroy(new TransportChannel(sender, receiver));
                this.transport._reply = Functions.as_method(function (message, data) {
                    if (message === "event")
                        this.trigger.apply(this, [data.event].concat(data.args));
                }, this);
            },

            _invoke: function (member, data, context) {
                return this.transport.send("invoke", {
                    member: member,
                    data: data,
                    context: context
                });
            }

        };
    });
});


Scoped.define("module:Stores.ChannelServerStore", [
    "module:Stores.Invokers.StoreInvokeeInvoker",
    "base:Channels.TransportChannel",
    "base:Functions"
], function (StoreInvokeeInvoker, TransportChannel, Functions, scoped) {
    return StoreInvokeeInvoker.extend({scoped: scoped}, function (inherited) {
        return {

            constructor: function (sender, receiver, store) {
                inherited.constructor.call(this, store);
                this.transport = this.auto_destroy(new TransportChannel(sender, receiver));
                this.transport._reply = Functions.as_method(function (message, data) {
                    if (message === "invoke")
                        return this.storeInvoke(data.member, data.data, data.context);
                }, this);
                store.on('all', function (eventName) {
                    this.transport.send("event", {
                        event: eventName,
                        args: Functions.getArguments(arguments, 1)
                    }, {
                        stateless: true
                    });
                }, this);
            }

        };
    });
});
