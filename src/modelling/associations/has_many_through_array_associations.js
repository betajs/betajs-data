Scoped.define("module:Modelling.Associations.HasManyThroughArrayAssociation", [
    "module:Modelling.Associations.HasManyAssociation",
    "base:Objs",
    "base:Types",
    "base:Functions"
], function(HasManyAssociation, Objs, Types, Functions, scoped) {
    return HasManyAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            __foreignKeyArray: function() {
                return Types.is_array(this._foreign_key) ? this._foreign_key : [this._foreign_key];
            },

            __readForeignKey: function() {
                var result = [];
                this.__foreignKeyArray().forEach(function(fk) {
                    result = result.concat(this._model.get(fk) || []);
                }, this);
                return result;
            },

            constructor: function() {
                inherited.constructor.apply(this, arguments);
                this._options.collectionOptions = Objs.extend({
                    secondary_ident: Functions.as_method(this._mapItemValue, this)
                }, this._options.collectionOptions);
                this.__foreignKeyArray().forEach(function(fk) {
                    this._model.on("change:" + fk, this._queryChanged, this);
                }, this);
            },

            _buildQuery: function(query, options) {
                var arr = this.__readForeignKey();
                if (this._options.map)
                    arr = arr.map(this._options.map, this._options.mapctx || this);
                return {
                    "query": Objs.extend(Objs.objectBy(
                        this._options.foreign_attr || this._foreignTable().primary_key(), Objs.objectBy(
                            this._options.ignore_case ? "$inic" : "$in",
                            arr
                        )), query)
                };
            },

            _queryCollectionUpdated: function(coll) {
                if (this._options.create_virtual) {
                    this.__readForeignKey().filter(function(key) {
                        return !coll.has(function(item) {
                            return this._matchItem(item, key);
                        }, this);
                    }, this).forEach(function(key) {
                        coll.add(this._options.create_virtual.call(this._options.create_virtual_ctx || this, key));
                    }, this);
                }
            },

            _mapValue: function(value) {
                if (this._options.map)
                    value = this._options.map.call(this._options.mapctx || this, value);
                if (this._options.ignore_case)
                    value = value.toLowerCase();
                return value;
            },

            _mapItemValue: function(item) {
                return this._mapValue(item.get(this._options.foreign_attr || this._foreignTable().primary_key()));
            },

            _matchItem: function(item, key) {
                return this._mapItemValue(item) === this._mapValue(key);
            },

            _remove: function(item) {
                this.__foreignKeyArray().forEach(function(fk) {
                    this._model.set(fk, this._model.get(fk).filter(function(key) {
                        return !this._matchItem(item, key);
                    }, this));
                }, this);
                if (this._options.create_virtual && this.collection.value() && !item.destroyed())
                    this.collection.value().remove(item);
            },

            _add: function(item) {
                if (!this.__readForeignKey().some(function(key) {
                        return this._matchItem(item, key);
                    }, this)) {
                    var fk = Types.is_array(this._foreign_key) ? this._foreign_key[0] : this._foreign_key;
                    var current = Objs.clone(this._model.get(fk) || [], 1);
                    current.push(item.get(this._options.foreign_attr || this._foreignTable().primary_key()));
                    this._model.set(fk, current);
                    if (this._options.create_virtual && this.collection.value())
                        this.collection.value().add(item);
                }
            }

        };
    });
});