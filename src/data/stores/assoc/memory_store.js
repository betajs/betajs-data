//Stores everything temporarily in the browser's memory

Scoped.define("module:Stores.MemoryStore", [
    "module:Stores.AssocStore",
    //"base:Iterators.ObjectValuesIterator",
    "base:Iterators.FilteredIterator",
    "base:Iterators.ArrayIterator",
    "base:Objs",
	"base:Promise"
], function (AssocStore, FilteredIterator, ArrayIterator, Objs, Promise, scoped) {
	return AssocStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (options) {
				inherited.constructor.call(this, options);
				// We reserve index 0.
				this.__dataByIndex = [null];
				this.__indexById = {};
				this.__count = 0;
			},

			_read_key: function (key) {
				var i = this.__indexById[key];
				return i ? this.__dataByIndex[i] : undefined;
			},

			_write_key: function (key, value) {
				var i = this.__indexById[key];
				if (!i) {
					i = this.__dataByIndex.length;
					this.__indexById[key] = i;
					this.__count++;
				}
				this.__dataByIndex[i] = value;
			},

			_remove_key: function (key) {
				var i = this.__indexById[key];
				if (i) {
					delete this.__indexById[key];
					delete this.__dataByIndex[i];
					this.__count--;
				}				
			},

			_iterate: function () {
				return new FilteredIterator(new ArrayIterator(this.__dataByIndex), function (item) {
					return !!item;
				});
				//return new ObjectValuesIterator(this.__data);
			},
			
			_count: function (query) {
				return query ? inherited._count.call(this, query) : Promise.value(this.__count);
			}

		};
	});
});
