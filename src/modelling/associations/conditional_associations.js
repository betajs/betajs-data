Scoped.define("module:Modelling.Associations.ConditionalAssociation", [
        "module:Modelling.Associations.Associations"
    ], function (Associations, scoped) {
    return Associations.extend({scoped: scoped}, {
	
		_yield: function () {
			var assoc = this.assoc();
			return assoc.yield.apply(assoc, arguments);
		},
		
		assoc: function () {
			return this._model.assocs[this._options.conditional(this._model)];
		}

    });
});