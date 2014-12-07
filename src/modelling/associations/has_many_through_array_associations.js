BetaJS.Modelling.Associations.HasManyAssociation.extend("BetaJS.Modelling.Associations.HasManyThroughArrayAssociation", {

	_yield: function () {
		var returnPromise = BetaJS.Promise.create();
		var promises = BetaJS.Promise.and();
		BetaJS.Objs.iter(this._model.get(this._foreign_key), function (id) {
			promises = promises.and(this._foreign_table.findById(id));
		}, this);
		promises.forwardError(returnPromise).success(function (result) {
			returnPromise.asyncSuccess(BetaJS.Objs.filter(result, function (item) {
				return !!item;
			}));
		});
		return returnPromise;
	}

});