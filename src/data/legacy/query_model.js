Scoped.define("module:Queries.AbstractQueryModel", [
	    "base:Class"
	], function (Class, scoped) {
	return Class.extend({scoped: scoped}, {
	
		register: function (query) {},
		
		executable: function (query) {}

	});
});


Scoped.define("module:Queries.DefaultQueryModel", [
        "module:Queries.AbstractQueryModel",
        "module:Queries.Constrained",
        "base:Objs"
    ], function (AbstractQueryModel, Constrained, Objs, scoped) {
    return AbstractQueryModel.extend({scoped: scoped}, function (inherited) {
		return {
					
			constructor: function () {
				inherited.constructor.call(this);
		        this.__queries = {};    
			},
			
			_insert: function (query) {
				this.__queries[Constrained.serialize(query)] = query;
			},
			
			_remove: function (query) {
				delete this.__queries[Constrained.serialize(query)];
			},
			
			exists: function (query) {
				return Constrained.serialize(query) in this.__queries;
			},
			
			subsumizer_of: function (query) {
		        if (this.exists(query))
		            return query;
		        var result = null;
		        Objs.iter(this.__queries, function (query2) {
		            if (Constrained.subsumizes(query2, query))
		                result = query2;
		            return !result;
		        }, this);
		        return result;
			},
			
			executable: function (query) {
			    return !!this.subsumizer_of(query);
			},
			
			register: function (query) {
				var changed = true;
				var check = function (query2) {
					if (Constrained.subsumizes(query, query2)) {
						this._remove(query2);
						changed = true;
					}/* else if (Constrained.mergeable(query, query2)) {
						this._remove(query2);
						changed = true;
						query = Constrained.merge(query, query2);
					} */
				};
				while (changed) {
					changed = false;
					Objs.iter(this.__queries, check, this);
				}
				this._insert(query);
			},
			
			invalidate: function (query) {
			    var subsumizer = this.subsumizer_of(query);
			    if (subsumizer)
			       this._remove(subsumizer);
			}
	
		};
    });
});


Scoped.define("module:Queries.StoreQueryModel", [
       "module:Queries.DefaultQueryModel",
       "module:Queries.Constrained"
   ], function (DefaultQueryModel, Constrained, scoped) {
   return DefaultQueryModel.extend({scoped: scoped}, function (inherited) {
	   return {
			
			constructor: function (store) {
		        this.__store = store;
		        inherited.constructor.call(this);
			},
			
			initialize: function () {
				return this.__store.mapSuccess(function (result) {
					while (result.hasNext()) {
						var query = result.next();
						delete query.id;
		                this._insert(query);
					}
				}, this);
			},
			
			_insert: function (query) {
				inherited._insert.call(this, query);
				this.__store.insert(query);
			},
			
			_remove: function (query) {
				delete this.__queries[Constrained.serialize(query)];
				this.__store.query({query: query}).success(function (result) {
					while (result.hasNext())
						this.__store.remove(result.next().id);
				}, this);
			}

	    };
    });
});
