BetaJS.Modelling.Associations.TableAssociation.extend("BetaJS.Modelling.Associations.HasManyAssociation", {

	_id: function () {
		return this._primary_key ? this._model.get(this._primary_key) : this._model.id();
	},

	_yield: function () {
		return this.allBy();
	},

	yield: function () {
		return this._inherited(BetaJS.Modelling.Associations.HasManyAssociation, "yield").mapSuccess(function (items) {
			return new BetaJS.Iterators.ArrayIterator(items);
		});
	},
	
	findBy: function (query) {
		return this._foreign_table.findBy(BetaJS.Objs.objectBy(this._foreign_key, this._id()));
	},

	allBy: function (query, id) {
		return this._foreign_table.allBy(BetaJS.Objs.extend(BetaJS.Objs.objectBy(this._foreign_key, id ? id : this._id(), query)));
	}

});