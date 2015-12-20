test("test invoker stores", function() {
	var bottom = new BetaJS.Data.Stores.MemoryStore();
	var storeInvokeeInvoker = new BetaJS.Data.Stores.Invokers.StoreInvokeeInvoker(bottom);	
	var storeInvoker = new BetaJS.Data.Stores.Invokers.RestInvokeeStoreInvoker(storeInvokeeInvoker);
	var restInvoker = new BetaJS.Data.Stores.Invokers.StoreInvokeeRestInvoker(storeInvoker);
	var top = new BetaJS.Data.Stores.Invokers.InvokerStore(restInvoker);
	var obj = top.insert({foo: "bar"}).value();
	QUnit.equal(obj.foo, "bar");
	QUnit.equal(top.get(obj.id).value().foo, "bar");
	top.insert({foo: "baz"});
	QUnit.equal(top.query({}, {sort: {foo: 1}, limit: 1}).value().next().foo, "bar");
	QUnit.equal(top.query({}, {sort: {foo: -1}, limit: 1}).value().next().foo, "baz");
});