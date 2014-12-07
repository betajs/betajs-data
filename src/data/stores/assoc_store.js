BetaJS.Stores.BaseStore.extend("BetaJS.Stores.AssocStore", {
	
	_read_key: function (key) {},
	_write_key: function (key, value) {},
	_remove_key: function (key) {},
	_iterate: function () {},
	
	constructor: function (options) {
		options = options || {};
		options.create_ids = true;
		this._inherited(BetaJS.Stores.AssocStore, "constructor", options);
	},
	
	_insert: function (data) {
		return BetaJS.Promise.tryCatch(function () {
			this._write_key(data[this._id_key], data);
			return data;
		}, this);
	},
	
	_remove: function (id) {
		return BetaJS.Promise.tryCatch(function () {
			var row = this._read_key(id);
			if (row && !this._remove_key(id))
				return null;
			return row;
		}, this);
	},
	
	_get: function (id) {
		return BetaJS.Promise.tryCatch(function () {
			return this._read_key(id);
		}, this);
	},
	
	_update: function (id, data) {
		return BetaJS.Promise.tryCatch(function () {
			var row = this._read_key(id);
			if (row) {
			    if (this._id_key in data) {
			        this._remove_key(id);
	                id = data[this._id_key];
	                delete data[this._id_key];
			    }
				BetaJS.Objs.extend(row, data);
				this._write_key(id, row);
			}
			return row;
		}, this);
	},
	
	_query: function (query, options) {
		return BetaJS.Promise.tryCatch(function () {
			return this._iterate();
		}, this);
	}

});
