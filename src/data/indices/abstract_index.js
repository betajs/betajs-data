Scoped.define("module:Stores.AbstractIndex", [
                                              "base:Class",
                                              "base:Comparators",
                                              "base:Objs",
                                              "base:Functions"
                                              ], function (Class, Comparators, Objs, Functions, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (store, key, compare, options) {
				inherited.constructor.call(this);
				this._options = Objs.extend({
					exact: true,
					ignoreCase: false
				}, options);
				this._compare = compare || Comparators.byValue;
				this._store = store;
				this.__row_count = 0;
				this._initialize();
				var id_key = store.id_key();
				store.query({}).value().iterate(function (row) {
					this.__row_count++;
					this._insert(row[id_key], row[key]);
				}, this);
				store.on("insert", function (row) {
					this.__row_count++;
					this._insert(row[id_key], row[key]);
				}, this);
				store.on("remove", function (id) {
					this.__row_count--;
					this._remove(id);
				}, this);
				store.on("update", function (id, data) {
					if (key in data)
						this._update(id, data[key]);
				}, this);
			},

			_initialize: function () {},

			destroy: function () {
				this._store.off(null, null, this);
				inherited.destroy.call(this);
			},

			compare: function () {
				return this._compare.apply(arguments);
			},

			comparator: function () {
				return Functions.as_method(this, this._compare);
			},

			info: function () {
				return {
					row_count: this.__row_count,
					key_count: this._key_count(),
					key_count_ic: this._key_count_ic()
				};
			},

			options: function () {
				return this._options;
			},

			iterate: function (key, direction, callback, context) {
				this._iterate(key, direction, callback, context);
			},

			itemIterate: function (key, direction, callback, context) {
				this.iterate(key, direction, function (iterKey, id) {
					return callback.call(context, iterKey, this._store.get(id).value());
				}, this); 
			},

			iterate_ic: function (key, direction, callback, context) {
				this._iterate_ic(key, direction, callback, context);
			},

			itemIterateIc: function (key, direction, callback, context) {
				this.iterate_ic(key, direction, function (iterKey, id) {
					return callback.call(context, iterKey, this._store.get(id).value());
				}, this); 
			},

			_iterate: function (key, direction, callback, context) {},

			_iterate_ic: function (key, direction, callback, context) {},

			_insert: function (id, key) {},

			_remove: function (id) {},

			_update: function (id, key) {},

			_key_count: function () {},

			_key_count_ic: function () {},

			key_count_left_ic: function (key) {},
			key_count_right_ic: function (key) {},
			key_count_distance_ic: function (leftKey, rightKey) {},
			key_count_left: function (key) {},
			key_count_right: function (key) {},
			key_count_distance: function (leftKey, rightKey) {}

		};
	});
});
