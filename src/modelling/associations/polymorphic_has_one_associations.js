BetaJS.Modelling.Associations.Association.extend("BetaJS.Modelling.Associations.PolymorphicHasOneAssociation", {

	constructor: function (model, foreign_table_key, foreign_key, options) {
		this._inherited(BetaJS.Modelling.Associations.PolymorphicHasOneAssociation, "constructor", model, options);
		this._foreign_table_key = foreign_table_key;
		this._foreign_key = foreign_key;
		if (options["primary_key"])
			this._primary_key = options.primary_key;
	},

	_yield: function (id) {
		var value = id ? id : (this._primary_key ? this._model.get(this._primary_key) : this._model.id());
		var foreign_table = BetaJS.Scopes.resolve(this._model.get(this._foreign_table_key));
		return foreign_table.findBy(BetaJS.Objs.objectBy(this._foreign_key, value));
	}

});