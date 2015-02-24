Scoped.define("module:Stores.StoreException", ["base:Exceptions.Exception"], function (Exception, scoped) {
	return Exception.extend({scoped: scoped}, {});
});


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


Scoped.define("module:Stores.BaseStore", [
          "module:Stores.ListenerStore",
          "module:Stores.StoreException",
          "module:Queries.Constrained",
          "module:Queries",
          "base:Classes.TimedIdGenerator",
          "base:Promise",
          "base:Types",
          "base:Objs"
  	], function (ListenerStore, StoreException, Constrained, Queries, TimedIdGenerator, Promise, Types, Objs, scoped) {
  	return ListenerStore.extend({scoped: scoped}, function (inherited) {			
  		return {
				
			constructor: function (options) {
				inherited.constructor.call(this, options);
				options = options || {};
				this._id_key = options.id_key || "id";
				this._create_ids = options.create_ids || false;
				if (this._create_ids)
					this._id_generator = options.id_generator || this._auto_destroy(new TimedIdGenerator());
				this._query_model = "query_model" in options ? options.query_model : null;
			},
			
		    query_model: function () {
		        if (arguments.length > 0)
		            this._query_model = arguments[0];
		        return this._query_model;
		    },
		    
			_insert: function (data) {
				return Promise.create(null, new StoreException("unsupported: insert"));
			},
			
			_remove: function (id) {
				return Promise.create(null, new StoreException("unsupported: remove"));
			},
			
			_get: function (id) {
				return Promise.create(null, new StoreException("unsupported: get"));
			},
			
			_update: function (id, data) {
				return Promise.create(null, new StoreException("unsupported: update"));
			},
			
			_query_capabilities: function () {
				return {};
			},
			
			_query: function (query, options) {
				return Promise.create(null, new StoreException("unsupported: query"));
			},
			
			insert: function (data) {
				var event_data = null;
				if (Types.is_array(data)) {
					event_data = data[1];
					data = data[0];
				}			
				if (this._create_ids && !(this._id_key in data && data[this._id_key]))
					data[this._id_key] = this._id_generator.generate();
				return this._insert(data).success(function (row) {
					this._inserted(row, event_data);
				}, this);
			},
			
			insert_all: function (data, query) {
				var event_data = null;
				if (arguments.length > 2)
					event_data = arguments[2];
				if (query && this._query_model) {
					this.trigger("query_register", query);
					this._query_model.register(query);
				}
				var promise = Promise.and();
				for (var i = 0; i < data.length; ++i)
					promise = promise.and(this.insert(event_data ? [data[i], event_data] : data[i]));
				return promise.end();
			},
		
			remove: function (id) {
				var event_data = null;
				if (Types.is_array(id)) {
					event_data = id[1];
					id = id[0];
				}			
				return this._remove(id).success(function () {
					this._removed(id, event_data);
				}, this);
			},
			
			get: function (id) {
				return this._get(id);
			},
			
			update: function (id, data) {
				var event_data = null;
				if (Types.is_array(data)) {
					event_data = data[1];
					data = data[0];
				}			
				return this._update(id, data).success(function (row) {
					this._updated(row, data, event_data);
				}, this);
			},
			
			query: function (query, options) {
				query = Objs.clone(query, -1);
				if (options) {
					if (options.limit)
						options.limit = parseInt(options.limit, 10);
					if (options.skip)
						options.skip = parseInt(options.skip, 10);
				}
				if (this._query_model) {
				    var subsumizer = this._query_model.subsumizer_of({query: query, options: options});
		    		if (!subsumizer) {
		    			this.trigger("query_miss", {query: query, options: options});
		    			return Promise.error(new StoreException("Cannot execute query"));
		    		}
		    		this.trigger("query_hit", {query: query, options: options}, subsumizer);
				}
				return Constrained.emulate(
						Constrained.make(query, options || {}),
						this._query_capabilities(),
						this._query,
						this);
			},
			
			_query_applies_to_id: function (query, id) {
				var row = this.get(id);
				return row && Queries.overloaded_evaluate(query, row);
			},
			
			_ensure_index: function (key) {
			},
			
			ensure_index: function (key) {
				return this._ensure_index(key);
			},
			
			clear: function () {
				return this.query().mapSuccess(function (iter) {
					var promise = Promise.and();
					while (iter.hasNext()) {
						var obj = iter.next();
						promise = promise.and(this.remove(obj[this._id_key]));
					}
					return promise;
				}, this);
			},
			
			perform: function (commit) {
				var action = Objs.keyByIndex(commit);
				var data = Objs.valueByIndex(commit);
				if (action == "insert")
					return this.insert(data);
				else if (action == "remove")
					return this.remove(data);
				else if (action == "update")
					return this.update(Objs.keyByIndex(data), Objs.valueByIndex(data));
				else
					return Promise.error(new StoreException("unsupported: perform " + action));
			}

  		};
  	});
});
