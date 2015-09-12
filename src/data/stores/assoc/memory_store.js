//Stores everything temporarily in the browser's memory

Scoped.define("module:Stores.MemoryStore", [
                                            "module:Stores.AssocStore",
                                            "base:Iterators.ObjectValuesIterator",
                                            "base:Objs"
                                            ], function (AssocStore, ObjectValuesIterator, Objs, scoped) {
	return AssocStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (options) {
				inherited.constructor.call(this, options);
				this.__data = {};
			},

			_read_key: function (key) {
				return this.__data[key];
			},

			_write_key: function (key, value) {
				this.__data[key] = value;
			},

			_remove_key: function (key) {
				delete this.__data[key];
			},

			_iterate: function () {
				return new ObjectValuesIterator(this.__data);
			},
			
			_count: function (query) {
				return query ? inherited._count.call(this, query) : Objs.count(this.__data);
			}

		};
	});
});
