//Stores everything permanently in the browser's local storage

Scoped.define("module:Stores.LocalStore", ["module:Stores.AssocDumbStore"], function (AssocDumbStore, scoped) {
	return AssocDumbStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (options) {
				inherited.constructor.call(this, options);
				this.__prefix = options.prefix;
				this.__localStorage = Scoped.getGlobal("localStorage");
			},

			__key: function (key) {
				return this.__prefix + key;
			},

			_read_key: function (key) {
				try {
					return JSON.parse(this.__localStorage.getItem(this.__key(key)));
				} catch (e) {
					return null;
				}
			},

			_write_key: function (key, value) {
				this.__localStorage.setItem(this.__key(key), JSON.stringify(value));
			},

			_remove_key: function (key) {
				this.__localStorage.removeItem(this.__key(key));
			}

		};
	});
});
