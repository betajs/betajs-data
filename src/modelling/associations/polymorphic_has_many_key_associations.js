Scoped.define("module:Modelling.Associations.PolymorphicHasManyKeyAssociation", [
    "module:Modelling.Associations.HasManyKeyAssociation",
    "base:Objs"
], function(HasManyKeyAssociation, Objs, scoped) {
    return HasManyKeyAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(model, foreign_table, foreign_key, foreign_type_key, options) {
                inherited.constructor.call(this, model, foreign_table, foreign_key, options);
                this._foreign_type_key = foreign_type_key;
            },

            _buildQuery: function(query, options) {
                return Objs.extend({
                    "query": Objs.extend(Objs.objectBy(
                        this._foreign_key,
                        this._model.id(),
                        this._foreign_type_key,
                        this._model.type()
                    ), query)
                }, options);
            },

            _remove: function(item) {
                inherited._remove.call(this, item);
                item.set(this._foreign_type_key, null);
            },

            _add: function(item) {
                inherited._add.call(this, item);
                item.set(this._foreign_type_key, this._model.type());
            }

        };
    });
});