Scoped.define("module:Stores.MemoryIndex", [
                                            "module:Stores.AbstractIndex",
                                            "base:Structures.TreeMap",
                                            "base:Objs"
                                            ], function (AbstractIndex, TreeMap, Objs, scoped) {
	return AbstractIndex.extend({scoped: scoped}, function (inherited) {
		return {

			_initialize: function () {
				if (this._options.exact)
					this._exactMap = TreeMap.empty(this._compare);
				if (this._options.ignoreCase)
					this._ignoreCaseMap = TreeMap.empty(this._compare);
				this._idToKey = {};
			},

			__insert: function (id, key, map) {
				var value = TreeMap.find(key, map);
				if (value)
					value[id] = true;
				else 
					map = TreeMap.add(key, Objs.objectBy(id, true), map);
				return map;
			},

			_insert: function (id, key) {
				this._idToKey[id] = key;
				if (this._options.exact)
					this._exactMap = this.__insert(id, key, this._exactMap);
				if (this._options.ignoreCase)
					this._ignoreCaseMap = this.__insert(id, key, this._ignoreCaseMap);
			},

			__remove: function (key, map, id) {
				var value = TreeMap.find(key, map);
				delete value[id];
				if (Objs.is_empty(value))
					map = TreeMap.remove(key, map);
				return map;
			},

			_remove: function (id) {
				var key = this._idToKey[id];
				delete this._idToKey[id];
				if (this._options.exact)
					this._exactMap = this.__remove(key, this._exactMap, id);
				if (this._options.ignoreCase)
					this._ignoreCaseMap = this.__remove(key, this._ignoreCaseMap, id);
			},

			_update: function (id, key) {
				var old_key = this._idToKey[id];
				if (old_key == key)
					return;
				this._remove(id);
				this._insert(id, key);
			},

			_iterate: function (key, direction, callback, context) {
				TreeMap.iterate_from(key, this._exactMap, function (iterKey, value) {
					for (var id in value) {
						if (callback.call(context, iterKey, id) === false)
							return false;
					}
					return true;
				}, this, !direction);
			},	

			_iterate_ic: function (key, direction, callback, context) {
				TreeMap.iterate_from(key, this._ignoreCaseMap, function (iterKey, value) {
					for (var id in value) {
						if (callback.call(context, iterKey, id) === false)
							return false;
					}
					return true;
				}, this, !direction);
			},	

			_key_count: function () {
				return this._options.exact ? TreeMap.length(this._exactMap) : 0;
			},

			_key_count_ic: function () {
				return this._options.ignoreCase ? TreeMap.length(this._ignoreCaseMap) : 0;
			},

			key_count_left_ic: function (key) {
				return TreeMap.treeSizeLeft(key, this._ignoreCaseMap);
			},

			key_count_right_ic: function (key) {
				return TreeMap.treeSizeRight(key, this._ignoreCaseMap);
			},

			key_count_distance_ic: function (leftKey, rightKey) {
				return TreeMap.distance(leftKey, rightKey, this._ignoreCaseMap);
			},

			key_count_left: function (key) {
				return TreeMap.treeSizeLeft(key, this._exactMap);
			},

			key_count_right: function (key) {
				return TreeMap.treeSizeRight(key, this._exactMap);
			},

			key_count_distance: function (leftKey, rightKey) {
				return TreeMap.distance(leftKey, rightKey, this._exactMap);
			}

		};
	});
});
