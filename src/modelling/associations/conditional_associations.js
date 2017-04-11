Scoped.define("module:Modelling.Associations.ConditionalAssociation", [
    "module:Modelling.Associations.Association",
    "base:Objs"
], function(Associations, Objs, scoped) {
    return Associations.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(model, options) {
                inherited.constructor.call(this, model, Objs.extend({
                    conditional: function() {
                        return true;
                    }
                }, options));
            },

            _execute: function() {
                var assoc = this.assoc();
                return assoc.execute.apply(assoc, arguments);
            },

            assoc: function() {
                return this._model.assocs[this._options.conditional(this._model)];
            }

        };
    });
});