BetaJS.Modelling.Associations.Association.extend("BetaJS.Modelling.Associations.ConditionalAssociation", {

	_yield: function () {
		var assoc = this.assoc();
		return assoc.yield.apply(assoc, arguments);
	},
	
	assoc: function () {
		return this._model.assocs[this._options.conditional(this._model)];
	}

});