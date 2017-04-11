Scoped.define("module:Modelling.Associations.HasManyThroughArrayAssociation", [
    "module:Modelling.Associations.HasManyAssociation",
    "base:Promise",
    "base:Objs"
], function(HasManyAssociation, Promise, Objs, scoped) {
    return HasManyAssociation.extend({
        scoped: scoped
    }, {

        _execute: function() {
            var returnPromise = Promise.create();
            var promises = Promise.and();
            Objs.iter(this._model.get(this._foreign_key), function(id) {
                promises = promises.and(this._foreign_table.findById(id));
            }, this);
            promises.forwardError(returnPromise).success(function(result) {
                returnPromise.asyncSuccess(Objs.filter(result, function(item) {
                    return !!item;
                }));
            });
            return returnPromise;
        }

    });
});