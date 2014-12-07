BetaJS.Modelling.Associations.TableAssociation.extend("BetaJS.Modelling.Associations.BelongsToAssociation", {
	
	_yield: function () {
		return this._primary_key ?
			this._foreign_table.findBy(BetaJS.Objs.objectBy(this._primary_key, this._model.get(this._foreign_key))) :
			this._foreign_table.findById(this._model.get(this._foreign_key));
	}
	
});