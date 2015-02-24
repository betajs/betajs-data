// Stores everything temporarily in the browser's memory

Scoped.define("module:Stores.MemoryStore", [
          "module:Stores.AssocStore",
          "base:Iterators.ObjectValuesIterator"
  	], function (AssocStore, ObjectValuesIterator, scoped) {
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
			}

  		};
  	});
});
