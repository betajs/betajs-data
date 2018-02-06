Scoped.define("module:Modelling.Associations.BelongsToAssociation", [
    "module:Modelling.Associations.OneAssociation",
    "base:Objs"
], function(OneAssociation, Objs, scoped) {
    return OneAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function() {
                inherited.constructor.apply(this, arguments);
                this._model.on("change:" + this._foreign_key, this._queryChanged, this);
            },

            _buildQuery: function(query) {
                return Objs.objectBy(this._foreignTable().primary_key(), this._model.get(this._foreign_key));
            },

            _unset: function() {
                this._model.set(this._foreign_key, null);
            },

            _set: function(model) {
                this._model.set(this._foreign_key, model.id());
            }

        };
    });
});