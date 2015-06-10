Scoped.define("module:Stores.DumbStore", [
                                          "module:Stores.BaseStore",
                                          "base:Promise",
                                          "base:Objs",
                                          "base:Iterators.Iterator"
                                          ], function (BaseStore, Promise, Objs, Iterator, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			_read_last_id: function () {},
			_write_last_id: function (id) {},
			_remove_last_id: function () {},
			_read_first_id: function () {},
			_write_first_id: function (id) {},
			_remove_first_id: function () {},
			_read_item: function (id) {},
			_write_item: function (id, data) {},
			_remove_item: function (id) {},
			_read_next_id: function (id) {},
			_write_next_id: function (id, next_id) {},
			_remove_next_id: function (id) {},
			_read_prev_id: function (id) {},
			_write_prev_id: function (id, prev_id) {},
			_remove_prev_id: function (id) {},

			constructor: function (options) {
				options = options || {};
				options.create_ids = true;
				inherited.constructor.call(this, options);
			},

			_insert: function (data) {
				return Promise.tryCatch(function () {
					var last_id = this._read_last_id();
					var id = data[this._id_key];
					if (last_id !== null) {
						this._write_next_id(last_id, id);
						this._write_prev_id(id, last_id);
					} else
						this._write_first_id(id);
					this._write_last_id(id);
					this._write_item(id, data);
					return data;
				}, this);
			},

			_remove: function (id) {
				return Promise.tryCatch(function () {
					var row = this._read_item(id);
					if (row) {
						this._remove_item(id);
						var next_id = this._read_next_id(id);
						var prev_id = this._read_prev_id(id);
						if (next_id !== null) {
							this._remove_next_id(id);
							if (prev_id !== null) {
								this._remove_prev_id(id);
								this._write_next_id(prev_id, next_id);
								this._write_prev_id(next_id, prev_id);
							} else {
								this._remove_prev_id(next_id);
								this._write_first_id(next_id);
							}
						} else if (prev_id !== null) {
							this._remove_next_id(prev_id);
							this._write_last_id(prev_id);
						} else {
							this._remove_first_id();
							this._remove_last_id();
						}
					}
					return row;
				}, this);
			},

			_get: function (id) {
				return Promise.tryCatch(function () {
					return this._read_item(id);
				}, this);
			},

			_update: function (id, data) {
				return Promise.tryCatch(function () {
					var row = this._get(id);
					if (row) {
						delete data[this._id_key];
						Objs.extend(row, data);
						this._write_item(id, row);
					}
					return row;
				}, this);
			},

			_query: function (query, options) {
				return Promise.tryCatch(function () {
					var iter = new Iterator();
					var store = this;
					var fid = this._read_first_id();
					Objs.extend(iter, {
						__id: fid === null ? 1 : fid,
								__store: store,
								__query: query,

								hasNext: function () {
									var last_id = this.__store._read_last_id();
									if (last_id === null)
										return false;
									while (this.__id < last_id && !this.__store._read_item(this.__id))
										this.__id++;
									return this.__id <= last_id;
								},

								next: function () {
									if (this.hasNext()) {
										var item = this.__store.get(this.__id);
										if (this.__id == this.__store._read_last_id())
											this.__id++;
										else
											this.__id = this.__store._read_next_id(this.__id);
										return item;
									}
									return null;
								}
					});
					return iter;
				}, this);
			}	

		};
	});
});
