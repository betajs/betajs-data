Scoped.define("module:Stores.AssocStore", [
                                           "module:Stores.BaseStore",
                                           "base:Promise",
                                           "base:Objs"
                                           ], function (BaseStore, Promise, Objs, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			_read_key: function (key) {},
			_write_key: function (key, value) {},
			_remove_key: function (key) {},
			_iterate: function () {},

			constructor: function (options) {
				options = options || {};
				options.create_ids = true;
				inherited.constructor.call(this, options);
			},

			_insert: function (data) {
				return Promise.tryCatch(function () {
					this._write_key(data[this._id_key], data);
					return data;
				}, this);
			},

			_remove: function (id) {
				return Promise.tryCatch(function () {
					var row = this._read_key(id);
					if (row && !this._remove_key(id))
						return null;
					return row;
				}, this);
			},

			_get: function (id) {
				return Promise.tryCatch(function () {
					return this._read_key(id);
				}, this);
			},

			_update: function (id, data) {
				return Promise.tryCatch(function () {
					var row = this._read_key(id);
					if (row) {
						if (this._id_key in data) {
							this._remove_key(id);
							id = data[this._id_key];
							delete data[this._id_key];
						}
						Objs.extend(row, data);
						this._write_key(id, row);
					}
					return row;
				}, this);
			},

			_query: function (query, options) {
				return Promise.tryCatch(function () {
					return this._iterate();
				}, this);
			}

		};
	});
});
