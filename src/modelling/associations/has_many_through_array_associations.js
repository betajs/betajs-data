Scoped.define("module:Modelling.Associations.HasManyThroughArrayAssociation", [
    "module:Modelling.Associations.HasManyAssociation",
    "base:Objs"
], function(HasManyAssociation, Objs, scoped) {
    return HasManyAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function() {
                inherited.constructor.apply(this, arguments);
                this._model.on("change:" + this._foreign_key, this._queryChanged, this);
            },

            _buildQuery: function(query, options) {
                return {
                    "query": Objs.objectBy(this._foreign_table.primary_key(), {
                        "$in": this._model.get(this._foreign_key)
                    })
                };
            },

            _remove: function(item) {
                this._model.set(this._foreign_key, this._model.get(this._foreign_key).filter(function(key) {
                    return key !== item.id();
                }));
            },

            _add: function(item) {
                var current = Objs.clone(this._model.get(this._foreign_key), 1);
                var exists = current.some(function(key) {
                    return key === item.id();
                });
                if (!exists) {
                    current.push(item.id());
                    this._model.set(this._foreign_key, current);
                }
            }

        };
    });
});