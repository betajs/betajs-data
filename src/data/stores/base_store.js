BetaJS.Exceptions.Exception.extend("BetaJS.Stores.StoreException");

BetaJS.Class.extend("BetaJS.Stores.ListenerStore", [
	BetaJS.Events.EventsMixin,
	{
		
	constructor: function (options) {
		this._inherited(BetaJS.Stores.ListenerStore, "constructor");
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
		
}]);



BetaJS.Stores.BaseStore = BetaJS.Stores.ListenerStore.extend("BetaJS.Stores.BaseStore", {
		
	constructor: function (options) {
		this._inherited(BetaJS.Stores.BaseStore, "constructor", options);
		options = options || {};
		this._id_key = options.id_key || "id";
		this._create_ids = options.create_ids || false;
		if (this._create_ids)
			this._id_generator = options.id_generator || this._auto_destroy(new BetaJS.Classes.TimedIdGenerator());
		this._query_model = "query_model" in options ? options.query_model : null;
	},
	
    query_model: function () {
        if (arguments.length > 0)
            this._query_model = arguments[0];
        return this._query_model;
    },
    
	_insert: function (data) {
		return BetaJS.Promise.create(null, new BetaJS.Stores.StoreException("unsupported: insert"));
	},
	
	_remove: function (id) {
		return BetaJS.Promise.create(null, new BetaJS.Stores.StoreException("unsupported: remove"));
	},
	
	_get: function (id) {
		return BetaJS.Promise.create(null, new BetaJS.Stores.StoreException("unsupported: get"));
	},
	
	_update: function (id, data) {
		return BetaJS.Promise.create(null, new BetaJS.Stores.StoreException("unsupported: update"));
	},
	
	_query_capabilities: function () {
		return {};
	},
	
	_query: function (query, options) {
		return BetaJS.Promise.create(null, new BetaJS.Stores.StoreException("unsupported: query"));
	},
	
	insert: function (data) {
		var event_data = null;
		if (BetaJS.Types.is_array(data)) {
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
		var promise = BetaJS.Promise.and();
		for (var i = 0; i < data.length; ++i)
			and = promise.and(this.insert(event_data ? [data[i], event_data] : data[i]));
		return and.end();
	},

	remove: function (id) {
		var event_data = null;
		if (BetaJS.Types.is_array(id)) {
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
		if (BetaJS.Types.is_array(data)) {
			event_data = data[1];
			data = data[0];
		}			
		return this._update(id, data).success(function (row) {
			this._updated(row, data, event_data);
		}, this);
	},
	
	query: function (query, options) {
		query = BetaJS.Objs.clone(query, -1);
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
    			return BetaJS.Promise.error(new BetaJS.Stores.StoreException("Cannot execute query"));
    		}
    		this.trigger("query_hit", {query: query, options: options}, subsumizer);
		}
		return BetaJS.Queries.Constrained.emulate(
				BetaJS.Queries.Constrained.make(query, options || {}),
				this._query_capabilities(),
				this._query,
				this);
	},
	
	_query_applies_to_id: function (query, id) {
		var row = this.get(id);
		return row && BetaJS.Queries.overloaded_evaluate(query, row);
	},
	
	_ensure_index: function (key) {
	},
	
	ensure_index: function (key) {
		return this._ensure_index(key);
	},
	
	clear: function () {
		return this.query().mapSuccess(function (iter) {
			var promise = BetaJS.Promise.and();
			while (iter.hasNext()) {
				var obj = iter.next();
				promise = promise.and(this.remove(obj[this._id_key]));
			}
			return promise;
		}, this);
	},
	
	perform: function (commit) {
		var action = BetaJS.Objs.keyByIndex(commit);
		var data = BetaJS.Objs.valueByIndex(commit);
		if (action == "insert")
			return this.insert(data);
		else if (action == "remove")
			return this.remove(data);
		else if (action == "update")
			return this.update(BetaJS.Objs.keyByIndex(data), BetaJS.Objs.valueByIndex(data));
		else
			return BetaJS.Promise.error(new BetaJS.Stores.StoreException("unsupported: perform " + action));
	}

});
