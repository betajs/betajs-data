Scoped.define("module:Modelling.Associations.PolymorphicBelongsToAssociation", [
    "module:Modelling.Associations.BelongsToAssociation",
    "base:Objs"
], function(BelongsToAssociation, Objs, scoped) {
    return BelongsToAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(model, foreign_key, foreign_type_key, table_lookup_function, options) {
                inherited.constructor.call(this, model, null, foreign_key, options);
                this._foreign_type_key = foreign_type_key;
                this._table_lookup_function = table_lookup_function;
            },

            _foreignTable: function() {
                return this._table_lookup_function(this._model.get(this._foreign_type_key));
            },

            _unset: function() {
                inherited._unset.call(this);
                this._model.set(this._foreign_type_key, null);
            },

            _set: function(model) {
                inherited._set.call(this, model);
                this._model.set(this._foreign_type_key, model.type());
            }

        };
    });
});