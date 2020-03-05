Scoped.define("module:Stores.WriteStoreMixin", [
	"module:Stores.StoreException",
	"base:Promise",
	"base:IdGenerators.TimedIdGenerator",
	"base:Objs"
], function (StoreException, Promise, TimedIdGenerator, Objs) {
	return {

		_initializeWriteStore: function (options) {
			options = options || {};
			this._id_key = options.id_key || "id";
			this._create_ids = options.create_ids || false;
            this._validate_ids = options.validate_ids || false;
			this._id_lock = options.id_lock || false;
			this.preserve_preupdate_data = options.preserve_preupdate_data || false;
			if (this._create_ids)
				this._id_generator = options.id_generator || this._auto_destroy(new TimedIdGenerator());
			if (this._validate_ids)
				this._id_validator = options.id_validator || this._id_generator;
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

		_removed: function (id, ctx, data) {
			this.trigger("remove", id, ctx, data);
			this.trigger("write", "remove", id, ctx, data);
		},

		_updated: function (row, data, ctx, pre_data, transaction_id) {
			this.trigger("update", row, data, ctx, pre_data, transaction_id);
			this.trigger("write", "update", row, data, ctx, pre_data, transaction_id);
		}, 

		insert_all: function (data, ctx) {
			var promise = Promise.and();
			(data || []).forEach(function (item) {
                promise = promise.and(this.insert(item, ctx));
			}, this);
			return promise.end();
		},

		_insert: function (data, ctx) {
			return Promise.create(null, new StoreException("unsupported: insert"));
		},

		_remove: function (id, ctx) {
			return Promise.create(null, new StoreException("unsupported: remove"));
		},

		_update: function (id, data, ctx, transaction_id) {
			return Promise.create(null, new StoreException("unsupported: update"));
		},

		insert: function (data, ctx) {
			if (!data)
				return Promise.create(null, new StoreException("empty insert"));
            if (this._id_key in data && data[this._id_key] && this._id_lock)
            	return Promise.create(null, new StoreException("id lock"));
			if (this._create_ids && !(this._id_key in data && data[this._id_key]))
				data[this._id_key] = this._id_generator.generate(ctx);
			if (this._id_validator && this._id_key in data && data[this._id_key]) {
				if (!this._id_validator.valid(data[this._id_key], ctx))
	                return Promise.create(null, new StoreException("invalid id"));
			}
			return this._insert(data, ctx).success(function (row) {
				this._inserted(row, ctx);
			}, this);
		},

		remove: function (id, ctx) {
			return this._remove(id, ctx).success(function (data) {
				this._removed(id, ctx, data);
			}, this);
		},

		removeAllByIds: function (ids, ctx) {
			return Promise.and(ids.map(function (id) {
				return this.remove(id, ctx);
			}, this));
		},

		removeAllByQuery: function (query, options, ctx) {
			return this.query(query, options, ctx).mapSuccess(function (iter) {
				return this.removeAllByIds(iter.asArray().map(this.id_of, this));
			}, this);
		},

		update: function (id, data, ctx, transaction_id) {
			if (this.preserve_preupdate_data) {
                return this.get(id, ctx).mapSuccess(function (pre_data) {
                	var pre_data_filtered = {};
                	for (var key in data)
                        pre_data_filtered[key] = pre_data[key];
                	return this._update(id, data, ctx, transaction_id).success(function (row) {
                        this._updated(Objs.extend(Objs.objectBy(this._id_key, id), row), data, ctx, pre_data_filtered, transaction_id);
                    }, this);
                }, this);
			} else {
				return this._update(id, data, ctx, transaction_id).success(function (row) {
                    this._updated(Objs.extend(Objs.objectBy(this._id_key, id), row), data, ctx, undefined, transaction_id);
                }, this);
			}
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
