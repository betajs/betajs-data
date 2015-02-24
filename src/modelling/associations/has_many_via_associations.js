Scoped.define("module:Modelling.Associations.HasManyViaAssociation", [
        "module:Modelling.Associations.HasManyAssociation",
        "base:Objs",
        "base:Promise"
    ], function (HasManyAssociation, Objs, Promise, scoped) {
    return HasManyAssociation.extend({scoped: scoped}, function (inherited) {
		return {
			
			constructor: function (model, intermediate_table, intermediate_key, foreign_table, foreign_key, options) {
				inherited.constructor.call(this, model, foreign_table, foreign_key, options);
				this._intermediate_table = intermediate_table;
				this._intermediate_key = intermediate_key;
			},
		
			findBy: function (query) {
				var returnPromise = Promise.create();
				var intermediateQuery = Objs.objectBy(this._intermediate_key, this._id());
				this._intermediate_table.findBy(intermediateQuery).forwardError(return_promise).success(function (intermediate) {
					if (intermediate) {
						var full_query = Objs.extend(
							Objs.clone(query, 1),
							Objs.objectBy(this._foreign_table.primary_key(), intermediate.get(this._foreign_key)));
						this._foreign_table.findBy(full_query).forwardCallback(returnPromise);
					} else
						returnPromise.asyncSuccess(null);
				}, this);
				return returnPromise;
			},
		
			allBy: function (query, id) {
				var returnPromise = Promise.create();
				var intermediateQuery = Objs.objectBy(this._intermediate_key, id ? id : this._id());
				this._intermediate_table.allBy(intermediateQuery).forwardError(return_promise).success(function (intermediates) {
					var promises = Promise.and();
					while (intermediates.hasNext()) {
						var intermediate = intermediates.next();
						var full_query = Objs.extend(
							Objs.clone(query, 1),
							Objs.objectBy(this._foreign_table.primary_key(), intermediate.get(this._foreign_key)));
						promises = promises.and(this._foreign_table.allBy(full_query));
					}
					promises.forwardError(returnPromise).success(function (foreignss) {
						var results = [];
						Objs.iter(foreignss, function (foreigns) {
							while (foreigns.hasNext())
								results.push(foreigns.next());
						});
						returnPromise.asyncSuccess(results);
					}, this);
				}, this);
				return returnPromise;
			}

		};
    });
});