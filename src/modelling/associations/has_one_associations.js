Scoped.define("module:Modelling.Associations.HasOneAssociation", [
    "module:Modelling.Associations.TableAssociation",
    "base:Objs"
], function(TableAssociation, Objs, scoped) {
    return TableAssociation.extend({
        scoped: scoped
    }, {

        _execute: function(id) {
            var value = id ? id : (this._primary_key ? this._model.get(this._primary_key) : this._model.id());
            return this._foreign_table.findBy(Objs.objectBy(this._foreign_key, value));
        }

    });
});