Scoped.define("module:Modelling.Associations.HasManyCustomAssociation", [
    "module:Modelling.Associations.HasManyAssociation",
    "base:Objs"
], function(HasManyAssociation, Objs, scoped) {
    return HasManyAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            _buildQuery: function(query, options) {
                return {
                    "query": this._foreign_key,
                    "options": Objs.clone(options || {}, 1)
                };
            }

        };
    });
});