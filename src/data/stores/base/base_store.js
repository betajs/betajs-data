Scoped.define("module:Stores.BaseStore", [
  "base:Class",
  "base:Events.EventsMixin",
  "module:Stores.ReadStoreMixin",
  "module:Stores.WriteStoreMixin",
  "base:Promise",
  "base:Objs"
], function (Class, EventsMixin, ReadStoreMixin, WriteStoreMixin, Promise, Objs, scoped) {
	return Class.extend({scoped: scoped}, [EventsMixin, ReadStoreMixin, WriteStoreMixin, function (inherited) {			
		return {

			constructor: function (options) {
				inherited.constructor.call(this);
				this._initializeReadStore(options);
				this._initializeWriteStore(options);
			},

			_ensure_index: function (key) {
			},

			ensure_index: function (key) {
				return this._ensure_index(key);
			},

			getBy: function (key, value, ctx) {
				if (key === this.id_key())
					return this.get(value, ctx);
				return this.query(Objs.objectBy(key, value), {limit: 1}).mapSuccess(function (iter) {
					return iter.next();
				});
			},

			clear: function (ctx) {
				return this.query(null, null, ctx).mapSuccess(function (iter) {
					var promise = Promise.and();
					while (iter.hasNext()) {
						var obj = iter.next();
						promise = promise.and(this.remove(obj[this._id_key], ctx));
					}
					return promise;
				}, this);
			}

		};
	}]);
});
