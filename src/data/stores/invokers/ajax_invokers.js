Scoped.define("module:Stores.Invokers.RestInvokeeAjaxInvoker", [
    "base:Class",
    "base:Net.Uri",
    "module:Stores.Invokers.RestInvokee"
], function (Class, Uri, Invokee, scoped) {
	return Class.extend({scoped: scoped}, [Invokee, function (inherited) {
		return {
			
			constructor: function (ajax) {
				inherited.constructor.call(this);
				this.__ajax = ajax;
			},
			
			restInvoke: function (method, uri, post, get) {
				return this.__ajax.asyncCall({
					method: method,
					data: post,
					uri: Net.appendUriParams(uri, get)
				});
			}			
			
		};
	}]);
});
