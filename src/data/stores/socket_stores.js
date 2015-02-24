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
				this._supportsAsync = false;
			},
			
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


Scoped.define("module:Stores.SocketListenerStore", [
        "module:Stores.ListenerStore",
        "module:Stores.StoreException",
        "base:Objs"
	], function (ListenerStore, StoreException, Objs, scoped) {
	return ListenerStore.extend({scoped: scoped}, function (inherited) {			
		return {
		
			constructor: function (options, socket, prefix) {
				inherited.constructor.call(this, options);
				var self = this;
				this.__prefix = prefix;
				socket.on(this.__prefix + ":insert", function (data) {
					self._perform("insert", data);
				});
				socket.on(this.__prefix + ":remove", function (id) {
					self._perform("remove", id);
				});
				socket.on(this.__prefix + ":update", function (data) {
					self._perform("update", data);
				});
				socket.on(this.__prefix + ":bulk", function (commits) {
					for (var i = 0; i < commits.length; ++i)
						self._perform(Objs.keyByIndex(commits[i]), Objs.valueByIndex(commits[i]));
				});
			},
			
			_perform: function (action, data) {
				if (action == "insert")
					this._inserted(data);
				else if (action == "remove")
					this._removed(data);
				else if (action == "update")
					this._updated(Objs.objectBy(this.id_key(), Objs.keyByIndex(data)), Objs.valueByIndex(data));
				else
					throw new StoreException("unsupported: perform " + action);
			}

		};
	});
});