QUnit.test("test invoker stores", function(assert) {
	var bottom = new BetaJS.Data.Stores.MemoryStore();
	var storeInvokeeInvoker = new BetaJS.Data.Stores.Invokers.StoreInvokeeInvoker(bottom);	
	var storeInvoker = new BetaJS.Data.Stores.Invokers.RestInvokeeStoreInvoker(storeInvokeeInvoker);
	var restInvoker = new BetaJS.Data.Stores.Invokers.StoreInvokeeRestInvoker(storeInvoker);
	var top = new BetaJS.Data.Stores.Invokers.InvokerStore(restInvoker);
	var obj = top.insert({foo: "bar"}).value();
    assert.equal(obj.foo, "bar");
    assert.equal(top.get(obj.id).value().foo, "bar");
	top.insert({foo: "baz"});
    assert.equal(top.query({}, {sort: {foo: 1}, limit: 1}).value().next().foo, "bar");
    assert.equal(top.query({}, {sort: {foo: -1}, limit: 1}).value().next().foo, "baz");
});