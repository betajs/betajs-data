Scoped.define("module:Stores.RemoteStore", [
    "module:Stores.Invokers.InvokerStore",
    "module:Stores.Invokers.StoreInvokeeRestInvoker",
    "module:Stores.Invokers.RestInvokeeAjaxInvoker"
], function (Store, RestInvoker, AjaxInvoker, scoped) {
 	return Store.extend({scoped: scoped}, function (inherited) {
 		return {
 			
 			constructor: function (ajax, restOptions, storeOptions) {
 				var ajaxInvoker = new AjaxInvoker(ajax);
 				var restInvoker = new RestInvoker(ajaxInvoker, restOptions);
 				inherited.constructor.call(this, restInvoker, storeOptions);
 				this.auto_destroy(restInvoker);
 				this.auto_destroy(ajaxInvoker);
			}			
		
		};
	});
});
