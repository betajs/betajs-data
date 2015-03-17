Scoped.define("module:Modelling.Associations.ConditionalAssociation", [
        "module:Modelling.Associations.Associations",
        "base:Objs"
    ], function (Associations, Objs, scoped) {
    return Associations.extend({scoped: scoped}, function (inherited) {
		return {
		
		  	constructor: function (model, options) {
		  		inherited.constructor.call(this, model, Objs.extend({
		  			conditional: function () { return true; }
		  		}, options));
		  	},
	
			_yield: function () {
				var assoc = this.assoc();
				return assoc.yield.apply(assoc, arguments);
			},
			
			assoc: function () {
				return this._model.assocs[this._options.conditional(this._model)];
			}
		
		};
    });
});