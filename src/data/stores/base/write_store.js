Scoped.define("module:Stores.WriteStoreMixin", [
                                                "module:Stores.StoreException",                                               
                                                "base:Promise",
                                                "base:Classes.TimedIdGenerator",
                                                "base:Types"
                                                ], function (StoreException, Promise, TimedIdGenerator, Types) {
	return {

		_initializeWriteStore: function (options) {
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

		id_key: function () {
			return this._id_key;
		},

		id_of: function (row) {
			return row[this.id_key()];
		},

		_inserted: function (row, event_data) {
			this.trigger("insert", row, event_data);		
			this.trigger("write", "insert", row, event_data);
		},

		_removed: function (id, event_data) {
			this.trigger("remove", id, event_data);
			this.trigger("write", "remove", id, event_data);
		},

		_updated: function (row, data, event_data) {
			this.trigger("update", row, data, event_data);	
			this.trigger("write", "update", row, data, event_data);
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

		_insert: function (data) {
			return Promise.create(null, new StoreException("unsupported: insert"));
		},

		_remove: function (id) {
			return Promise.create(null, new StoreException("unsupported: remove"));
		},

		_update: function (id, data) {
			return Promise.create(null, new StoreException("unsupported: update"));
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

		update: function (id, data) {
			var event_data = null;
			if (Types.is_array(data)) {
				event_data = data[1];
				data = data[0];
			}			
			return this._update(id, data).success(function (row) {
				this._updated(row, data, event_data);
			}, this);
		}

	};
});


Scoped.define("module:Stores.WriteStore", [
                                           "base:Class",
                                           "base:Events.EventsMixin",
                                           "module:Stores.WriteStoreMixin"
                                           ], function (Class, EventsMixin, WriteStoreMixin, scoped) {
	return Class.extend({scoped: scoped}, [EventsMixin, WriteStoreMixin, function (inherited) {			
		return {

			constructor: function (options) {
				inherited.constructor.call(this);
				this._initializeWriteStore(options);
			},

			_ensure_index: function (key) {
			},

			ensure_index: function (key) {
				return this._ensure_index(key);
			}

		};
	}]);
});
