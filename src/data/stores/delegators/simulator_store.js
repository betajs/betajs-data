Scoped.define("module:Stores.SimulatorStore", [
                                               "module:Stores.PassthroughStore",
                                               "base:Promise"
                                               ], function (BaseStore, Promise, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {
			
			online: true,

			_preInsert: function () {
				return this.online ? inherited._preInsert.apply(this, arguments) : Promise.error("Offline");
			},
			
			_preRemove: function () {
				return this.online ? inherited._preRemove.apply(this, arguments) : Promise.error("Offline");
			},
			
			_preGet: function () {
				return this.online ? inherited._preGet.apply(this, arguments) : Promise.error("Offline");
			},
			
			_preUpdate: function () {
				return this.online ? inherited._preUpdate.apply(this, arguments) : Promise.error("Offline");
			},
			
			_preQuery: function () {
				return this.online ? inherited._preQuery.apply(this, arguments) : Promise.error("Offline");
			}
			
		};
	});
});
