Scoped.define("module:Collections.TableQueryCollection", [      
                                                          "module:Collections.QueryCollection",
                                                          "base:Objs"
                                                          ], function (QueryCollection, Objs, scoped) {
	return QueryCollection.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (source, query, options) {
				inherited.constructor.call(this, source, query, Objs.extend({
					id_key: source.primary_key()
				}, options));
				source.on("create", this._activeCreate, this);
				source.on("remove", this._activeRemove, this);
				source.on("update", this._activeUpdate, this);
			},

			destroy: function () {
				this._source.off(null, null, this);
				inherited.destroy.call(this);
			},

			_materialize: function (data) {
				return this._source.materialize(data);
			},
			
			_watcher: function () {
				return this._source.store().watcher();
			}

		};
	});
});


