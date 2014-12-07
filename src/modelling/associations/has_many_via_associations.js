BetaJS.Modelling.Associations.HasManyAssociation.extend("BetaJS.Modelling.Associations.HasManyViaAssociation", {

	constructor: function (model, intermediate_table, intermediate_key, foreign_table, foreign_key, options) {
		this._inherited(BetaJS.Modelling.Associations.HasManyViaAssociation, "constructor", model, foreign_table, foreign_key, options);
		this._intermediate_table = intermediate_table;
		this._intermediate_key = intermediate_key;
	},

	findBy: function (query) {
		var returnPromise = BetaJS.Promise.create();
		var intermediateQuery = BetaJS.Objs.objectBy(this._intermediate_key, this._id());
		this._intermediate_table.findBy(intermediateQuery).forwardError(return_promise).success(function (intermediate) {
			if (intermediate) {
				var full_query = BetaJS.Objs.extend(
					BetaJS.Objs.clone(query, 1),
					BetaJS.Objs.objectBy(this._foreign_table.primary_key(), intermediate.get(this._foreign_key)));
				this._foreign_table.findBy(full_query).forwardCallback(returnPromise);
			} else
				returnPromise.asyncSuccess(null);
		}, this);
		return returnPromise;
	},

	allBy: function (query, id) {
		var returnPromise = BetaJS.Promise.create();
		var intermediateQuery = BetaJS.Objs.objectBy(this._intermediate_key, id ? id : this._id());
		this._intermediate_table.allBy(intermediateQuery).forwardError(return_promise).success(function (intermediates) {
			var promises = BetaJS.Promise.and();
			while (intermediates.hasNext()) {
				var intermediate = intermediates.next();
				var full_query = BetaJS.Objs.extend(
					BetaJS.Objs.clone(query, 1),
					BetaJS.Objs.objectBy(this._foreign_table.primary_key(), intermediate.get(this._foreign_key)));
				promises = promises.and(this._foreign_table.allBy(full_query));
			}
			promises.forwardError(returnPromise).success(function (foreignss) {
				var results = [];
				BetaJS.Objs.iter(foreignss, function (foreigns) {
					while (foreigns.hasNext())
						results.push(foreigns.next());
				});
				returnPromise.asyncSuccess(results);
			}, this);
		}, this);
		return returnPromise;
	}

});