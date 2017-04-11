Scoped.define("module:Modelling.Associations.BelongsToAssociation", [
    "module:Modelling.Associations.TableAssociation",
    "base:Promise",
    "base:Objs"
], function(TableAssociation, Promise, Objs, scoped) {
    return TableAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            _execute: function() {
                var value = this._model.get(this._foreign_key);
                if (!value)
                    return Promise.value(null);
                return this._primary_key ?
                    this._foreign_table.findBy(Objs.objectBy(this._primary_key, value)) :
                    this._foreign_table.findById(value);
            }

        };
    });
});