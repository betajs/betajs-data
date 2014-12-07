BetaJS.Modelling.Associations.TableAssociation.extend("BetaJS.Modelling.Associations.HasOneAssociation", {

	_yield: function (id) {
		var value = id ? id : (this._primary_key ? this._model.get(this._primary_key) : this._model.id());
		return this._foreign_table.findBy(BetaJS.Objs.objectBy(this._foreign_key, value));
	}

});