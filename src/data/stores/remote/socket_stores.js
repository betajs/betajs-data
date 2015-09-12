Scoped.define("module:Stores.SocketStore", [
                                            "module:Stores.BaseStore",
                                            "base:Objs"
                                            ], function (BaseStore, Objs, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (options, socket, prefix) {
				inherited.constructor.call(this, options);
				this.__socket = socket;
				this.__prefix = prefix;
			},

			/** @suppress {missingProperties} */
			__send: function (action, data) {
				this.__socket.emit(this.__prefix + ":" + action, data);
			},

			_insert: function (data) {
				this.__send("insert", data);
			},

			_remove: function (id) {
				this.__send("remove", id);
			},

			_update: function (id, data) {
				this.__send("update", Objs.objectBy(id, data));
			}	

		};
	});
});


