Scoped.define("module:Stores.Invokers.RestInvokeeAjaxInvoker", [
    "base:Class",
    "base:Net.Uri",
    "base:Net.HttpHeader",
    "module:Stores.Invokers.RestInvokee"
], function (Class, Uri, HttpHeader, Invokee, scoped) {
	return Class.extend({scoped: scoped}, [Invokee, function (inherited) {
		return {
			
			constructor: function (ajax) {
				inherited.constructor.call(this);
				this.__ajax = ajax;
			},
			
			restInvoke: function (method, uri, post, get) {
				return this.__ajax.execute({
					method: method,
					data: post,
					uri: Uri.appendUriParams(uri, get)
				}).mapError(function (error) {
					return {
						error: error.status_code(),
						data: error.data ? error.data() : null,
						invalid: error.status_code() === HttpHeader.HTTP_STATUS_PRECONDITION_FAILED
					};
				}, this);
			}			
			
		};
	}]);
});