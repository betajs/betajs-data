Scoped.define("module:Stores.WriteStoreMixin", [
                                                "module:Stores.StoreException",                                               
                                                "base:Promise",
                                                "base:IdGenerators.TimedIdGenerator",
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
		
		id_row: function (id) {
			var result = {};
			result[this._id_key] = id;
			return result;
		},

		_inserted: function (row, ctx) {
			this.trigger("insert", row, ctx);		
			this.trigger("write", "insert", row, ctx);
		},

		_removed: function (id, ctx) {
			this.trigger("remove", id, ctx);
			this.trigger("write", "remove", id, ctx);
		},

		_updated: function (row, data, ctx) {
			this.trigger("update", row, data, ctx);	
			this.trigger("write", "update", row, data, ctx);
		}, 

		insert_all: function (data, ctx) {
			var promise = Promise.and();
			for (var i = 0; i < data.length; ++i)
				promise = promise.and(this.insert(data[i], ctx));
			return promise.end();
		},

		_insert: function (data, ctx) {
			return Promise.create(null, new StoreException("unsupported: insert"));
		},

		_remove: function (id, ctx) {
			return Promise.create(null, new StoreException("unsupported: remove"));
		},

		_update: function (id, data, ctx) {
			return Promise.create(null, new StoreException("unsupported: update"));
		},

		insert: function (data, ctx) {
			if (!data)
				return Promise.create(null, new StoreException("empty insert"));
			if (this._create_ids && !(this._id_key in data && data[this._id_key]))
				data[this._id_key] = this._id_generator.generate();
			return this._insert(data, ctx).success(function (row) {
				this._inserted(row, ctx);
			}, this);
		},

		remove: function (id, ctx) {
			return this._remove(id, ctx).success(function () {
				this._removed(id, ctx);
			}, this);
		},

		update: function (id, data, ctx) {
			return this._update(id, data, ctx).success(function (row) {
				this._updated(row, data, ctx);
			}, this);
		},
		
		unserialize: function (arr, ctx) {
			return this.insert_all(arr, ctx);
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
