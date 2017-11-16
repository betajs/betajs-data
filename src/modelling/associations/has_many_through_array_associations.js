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
                var arr = this._model.get(this._foreign_key);
                if (this._options.map)
                    arr = arr.map(this._options.map, this._options.mapctx || this);
                return {
                    "query": Objs.objectBy(
                        this._options.foreign_attr || this._foreign_table.primary_key(), Objs.objectBy(
                            this._options.ignore_case ? "$inic" : "$in",
                            arr
                        ))
                };
            },

            _queryCollectionUpdated: function(coll) {
                if (this._options.create_virtual) {
                    this._model.get(this._foreign_key).filter(function(key) {
                        return !coll.has(function(item) {
                            return this._matchItem(item, key);
                        }, this);
                    }, this).forEach(function(key) {
                        coll.add(this._options.create_virtual.call(this._options.create_virtual_ctx || this, key));
                    }, this);
                }
            },

            _matchItem: function(item, key) {
                var value = item.get(this._options.foreign_attr || this._foreign_table.primary_key());
                if (this._options.map)
                    key = this._options.map.call(this._options.mapctx || this, key);
                if (this._options.ignore_case) {
                    key = key.toLowerCase();
                    value = value.toLowerCase();
                }
                return value === key;
            },

            _remove: function(item) {
                this._model.set(this._foreign_key, this._model.get(this._foreign_key).filter(function(key) {
                    return !this._matchItem(item, key);
                }, this));
                if (this._options.create_virtual && this.collection.value())
                    this.collection.value().remove(item);
            },

            _add: function(item) {
                var current = Objs.clone(this._model.get(this._foreign_key) || [], 1);
                var exists = current.some(function(key) {
                    return this._matchItem(item, key);
                }, this);
                if (!exists) {
                    current.push(item.get(this._options.foreign_attr || this._foreign_table.primary_key()));
                    this._model.set(this._foreign_key, current);
                    if (this._options.create_virtual && this.collection.value())
                        this.collection.value().add(item);
                }
            }

        };
    });
});