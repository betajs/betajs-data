Scoped.define("module:Stores.StoresMonitor", [
          "base:Class",
          "base:Events.EventsMixin"
  	], function (Class, EventsMixin, scoped) {
  	return Class.extend({scoped: scoped}, [EventsMixin, {

	  	attach: function (ident, store) {
			store.on("insert", function (row) {
				this.trigger("insert", ident, store, row);
				this.trigger("write", "insert", ident, store, row);
			}, this);
			store.on("remove", function (id) {
				this.trigger("remove", ident, store, id);
				this.trigger("write", "remove", ident, store, id);
			}, this);
			store.on("update", function (row, data) {
				this.trigger("update", ident, store, row, data);
				this.trigger("write", "update", ident, store, row, data);
			}, this);
		}
		
  	}]);
});