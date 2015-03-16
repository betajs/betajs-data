Scoped.define("module:Stores.MemoryIndex", [
	"module:Stores.AbstractIndex",
	"base:Structures.TreeMap",
	"base:Objs"
], function (AbstractIndex, TreeMap, Objs, scoped) {
  	return AbstractIndex.extend({scoped: scoped}, function (inherited) {
  		return {
  			
  			constructor: function (store, key, compare) {
  				inherited.constructor.call(this, store, key, compare);
  				this._treeMap = TreeMap.empty(this._compare);
  				this._idToKey = {};
  			},
  			
  			_insert: function (id, key) {
				this._idToKey[id] = key;
  				var value = TreeMap.find(key, this._treeMap);
  				if (value)
  					value[id] = true;
  				else 
  					this._treeMap = TreeMap.add(key, Objs.objectBy(id, true), this._treeMap);
  			},
  			
  			_remove: function (id) {
  				var key = this._idToKey[id];
  				delete this._idToKey[id];
  				var value = TreeMap.find(key, this._treeMap);
  				delete value[id];
  				if (Objs.is_empty(value))
  					this._treeMap = TreeMap.remove(key, this._treeMap);
  			},
  			
  			_update: function (id, key) {
  				var old_key = this._idToKey[id];
  				if (old_key == key)
  					return;
  				this._remove(id);
  				this._insert(id, key);
  			},
  			
  			_iterate: function (key, direction, callback, context) {
  				TreeMap.iterate_from(key, this._treeMap, function (iterKey, value) {
  					for (var id in value) {
  						if (callback.call(context, iterKey, id) === false)
  							return false;
  					}
  					return true;
  				}, this, !direction);
  			}  			
  		
  		};
  	});
});
