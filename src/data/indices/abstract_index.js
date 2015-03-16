Scoped.define("module:Stores.AbstractIndex", [
	"base:Class",
	"base:Comparators"
], function (Class, Comparators, scoped) {
  	return Class.extend({scoped: scoped}, function (inherited) {
  		return {
  			
  			constructor: function (store, key, compare) {
  				inherited.constructor.call(this);
  				this._compare = compare || Comparators.byValue;
  				this._store = store;
  				var id_key = store.id_key();
  				store.query({}).value().iterate(function (row) {
  					this._insert(row[id_key], row[key]);
  				}, this);
  				store.on("insert", function (row) {
  					this._insert(row[id_key], row[key]);
  				}, this);
  				store.on("remove", function (id) {
  					this._remove(id);
  				}, this);
  				store.on("update", function (id, data) {
  					if (key in data)
  						this._update(id, data[key]);
  				}, this);
  			},

  			destroy: function () {
  				store.off(null, null, this);
  				inherited.destroy.call(this);
  			},
  			
  			iterate: function (key, direction, callback, context) {
  				this._iterate(key, direction, callback, context);
  			},
  			
  			itemIterate: function (key, direction, callback, context) {
  				this.iterate(key, direction, function (iterKey, id) {
  					return callback.call(context, iterKey, this._store.get(id).value());
  				}, this); 
  			},
  			
  			_iterate: function (key, direction, callback, context) {},
  			
  			_insert: function (id, key) {},
  			
  			_remove: function (id) {},
  			
  			_update: function (id, key) {}
  		
  		};
  	});
});
