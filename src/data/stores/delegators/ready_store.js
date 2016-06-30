Scoped.define("module:Stores.ReadyStore", [
                                               "module:Stores.PassthroughStore",
                                               "base:Promise",
                                               "base:Objs"
                                               ], function (PassthroughStore, Promise, Objs, scoped) {
	return PassthroughStore.extend({scoped: scoped}, function (inherited) {			
		return {
			
			__ready: false,
			
			ready: function () {
				this.__ready = true;
				Objs.iter(this.__promises, function (rec) {
					rec.promise.forwardCallback(rec.stalling);
				});
				delete this.__promises;
			},
			
			__execute: function (promise) {
				if (this.__ready)
					return promise;
				var stalling = Promise.create();
				this.__promises = this.__promises || [];
				this.__promises.push({
					stalling: stalling,
					promise: promise
				});
				return stalling;
			},

			_preInsert: function () {
				return this.__execute(inherited._preInsert.apply(this, arguments));
			},
			
			_preRemove: function () {
				return this.__execute(inherited._preRemove.apply(this, arguments));
			},
			
			_preGet: function () {
				return this.__execute(inherited._preGet.apply(this, arguments));
			},
			
			_preUpdate: function () {
				return this.__execute(inherited._preUpdate.apply(this, arguments));
			},
			
			_preQuery: function () {
				return this.__execute(inherited._preQuery.apply(this, arguments));
			}
			
		};
	});
});
