Scoped.define("module:Modelling.Associations.HasManyKeyAssociation", [
    "module:Modelling.Associations.HasManyAssociation",
    "base:Objs"
], function(HasManyAssociation, Objs, scoped) {
    return HasManyAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            _buildQuery: function(query, options) {
                return Objs.extend({
                    "query": Objs.objectBy(this._foreign_key, this._model.id())
                }, options);
            },

            _remove: function(item) {
                item.set(this._foreign_key, null);
            },

            _add: function(item) {
                item.set(this._foreign_key, this._model.id());
            }

        };
    });
});