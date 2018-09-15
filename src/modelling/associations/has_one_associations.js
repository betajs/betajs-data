Scoped.define("module:Modelling.Associations.HasOneAssociation", [
    "module:Modelling.Associations.OneAssociation",
    "base:Objs"
], function(HasManyAssociation, Objs, scoped) {
    return HasManyAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            _buildQuery: function(query, options) {
                return Objs.extend(Objs.objectBy(this._foreign_key, this._model.id()), query);
            },

            _unset: function() {
                if (this.active.value() && this.active.value().get("model"))
                    this.active.value().get("model").set(this._foreign_key, null);
            },

            _set: function(model) {
                model.set(this._foreign_key, this._model.id());
                this._unset();
            }

        };
    });
});