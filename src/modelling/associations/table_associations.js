Scoped.define("module:Modelling.Associations.TableAssociation", [
    "module:Modelling.Associations.Association"
], function(Association, scoped) {
    return Association.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(model, foreign_table, foreign_key, options) {
                inherited.constructor.call(this, model, options);
                this._foreign_table = foreign_table;
                this._foreign_key = foreign_key;
            }

        };
    });
});