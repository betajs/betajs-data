BetaJS.Modelling.Associations.TableAssociation.extend("BetaJS.Modelling.Associations.BelongsToAssociation", {
	
	_yield: function () {
		var value = this._model.get(this._foreign_key);
		if (!value)
			return BetaJS.Promise.value(null);
		return this._primary_key ?
			this._foreign_table.findBy(BetaJS.Objs.objectBy(this._primary_key, value)) :
			this._foreign_table.findById(value);
	}
	
});