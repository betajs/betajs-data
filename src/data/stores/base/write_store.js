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
		},

		id_key: function () {
			return this._id_key;
		},

		id_of: function (row) {
			return row[this.id_key()];
		},

		_inserted: function (row) {
			this.trigger("insert", row);		
			this.trigger("write", "insert", row);
		},

		_removed: function (id) {
			this.trigger("remove", id);
			this.trigger("write", "remove", id);
		},

		_updated: function (row, data) {
			this.trigger("update", row, data);	
			this.trigger("write", "update", row, data);
		}, 

		insert_all: function (data, query) {
			var promise = Promise.and();
			for (var i = 0; i < data.length; ++i)
				promise = promise.and(this.insert(data[i]));
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
			if (!data)
				return Promise.create(null, new StoreException("empty insert"));
			if (this._create_ids && !(this._id_key in data && data[this._id_key]))
				data[this._id_key] = this._id_generator.generate();
			return this._insert(data).success(function (row) {
				this._inserted(row);
			}, this);
		},

		remove: function (id) {
			return this._remove(id).success(function () {
				this._removed(id);
			}, this);
		},

		update: function (id, data) {
			return this._update(id, data).success(function (row) {
				this._updated(row, data);
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
