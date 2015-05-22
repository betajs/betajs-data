Scoped.define("module:Stores.ListenerStore", [
         "base:Class",
         "base:Events.EventsMixin"
 	], function (Class, EventsMixin, scoped) {
 	return Class.extend({scoped: scoped}, [EventsMixin, function (inherited) {			
 		return {
 			
	 		constructor: function (options) {
	 			inherited.constructor.call(this);
				options = options || {};
				this._id_key = options.id_key || "id";
			},
		
			id_key: function () {
				return this._id_key;
			},
			
			id_of: function (row) {
				return row[this.id_key()];
			},
			
			_inserted: function (row, event_data) {
				this.trigger("insert", row, event_data);		
			},
			
			_removed: function (id, event_data) {
				this.trigger("remove", id, event_data);		
			},
			
			_updated: function (row, data, event_data) {
				this.trigger("update", row, data, event_data);		
			} 

 		};
 	}]);
});



Scoped.define("module:Stores.ActiveStore", [
          "module:Stores.PassthroughStore"
  	], function (PassthroughStore, scoped) {
  	return PassthroughStore.extend({scoped: scoped}, function (inherited) {			
  		return {
			
			constructor: function (store, listener, options) {
				inherited.constructor.call(this, store, options);
				this.__listener = listener;
				this.delegateEvents(null, listener);
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
