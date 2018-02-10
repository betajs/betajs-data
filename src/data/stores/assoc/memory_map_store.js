//Stores everything temporarily in the browser's memory using map

Scoped.define("module:Stores.MemoryMapStore", [
    "module:Stores.AssocStore",
    "base:Iterators.FilteredIterator",
    "base:Iterators.NativeMapIterator",
    "base:Objs"
], function (AssocStore, FilteredIterator, NativeMapIterator, Objs, scoped) {
	return AssocStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (options) {
				inherited.constructor.call(this, options);
				this.__map = new Map();
			},

			_read_key: function (key) {
				return this.__map.get(key + "");
			},

			_write_key: function (key, value) {
				this.__map.set(key + "", value);
			},

			_remove_key: function (key) {
				this.__map['delete'](key + "");
			},

			_iterate: function () {
				var nativeMapIter = new NativeMapIterator(this.__map);
				return (new FilteredIterator(nativeMapIter, function (item) {
					return !!item;
				})).auto_destroy(nativeMapIter, true);
			},
			
			_count: function (query) {
				return query ? inherited._count.call(this, query) : this.__map.size;
			}						

		};
	});
});
