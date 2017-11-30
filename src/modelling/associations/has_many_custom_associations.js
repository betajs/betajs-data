Scoped.define("module:Modelling.Associations.HasManyCustomAssociation", [
    "module:Modelling.Associations.HasManyAssociation"
], function(HasManyAssociation, scoped) {
    return HasManyAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            _buildQuery: function(query, options) {
                return {
                    "query": this._foreign_key
                };
            }

        };
    });
});