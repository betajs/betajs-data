// Stores everything permanently in the browser's local storage

Scoped.define("module:Stores.LocalStore", [
          "module:Stores.AssocDumbStore",
          "json:"
  	], function (AssocDumbStore, JSON, scoped) {
  	return AssocDumbStore.extend({scoped: scoped}, function (inherited) {			
  		return {

			constructor: function (options, localStorage) {
				inherited.constructor.call(this, options);
				this.__prefix = options.prefix;
				this.__localStorage = localStorage;
			},
			
			__key: function (key) {
				return this.__prefix + key;
			},
			
			_read_key: function (key) {
				var prfkey = this.__key(key);
				return prfkey in this.__localStorage ? JSON.parse(this.__localStorage[prfkey]) : null;
			},
			
			_write_key: function (key, value) {
				this.__localStorage[this.__key(key)] = JSON.stringify(value);
			},
			
			_remove_key: function (key) {
				delete this.__localStorage[this.__key(key)];
			}

  		};
  	});
});
