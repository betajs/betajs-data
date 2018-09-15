Scoped.define("module:Modelling.Associations.HasManyInArrayAssociation", [
    "module:Modelling.Associations.HasManyAssociation",
    "base:Objs"
], function(HasManyAssociation, Objs, scoped) {
    return HasManyAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            _buildQuery: function(query, options) {
                return {
                    "query": Objs.objectBy(this._foreign_key, {
                        "$elemMatch": {
                            "$eq": this._model.id()
                        }
                    })
                };
            },

            _remove: function(item) {
                item.set(this._foreign_key, item.get(this._foreign_key).filter(function(key) {
                    return key !== this._model.id();
                }, this));
            },

            _add: function(item) {
                var current = Objs.clone(item.get(this._foreign_key), 1);
                var exists = current.some(function(key) {
                    return key === this._model.id();
                }, this);
                if (!exists) {
                    current.push(this._model.id());
                    item.set(this._foreign_key, current);
                }
            }

        };
    });
});