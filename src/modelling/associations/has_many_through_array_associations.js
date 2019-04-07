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

            __arrayMapToKeys: function(a) {
                if (!this._options.sub_key)
                    return a;
                return a.map(function(i) {
                    return i[this._options.sub_key];
                }, this);
            },

            __readForeignKey: function() {
                var result = [];
                this.__foreignKeyArray().forEach(function(fk) {
                    result = result.concat(this._model.get(fk) || []);
                }, this);
                return this.__arrayMapToKeys(result);
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
                            "$in",
                            arr
                        )), query)
                };
            },

            _queryCollectionUpdated: function(coll) {
                if (this._options.create_virtual) {
                    this.__readForeignKey().forEach(function(key) {
                        var models = [];
                        var realModels = 0;
                        coll.iterate(function(item) {
                            if (!this._matchItem(item, key))
                                return;
                            if (item.hasId())
                                realModels = 1;
                            else
                                models.push(item);
                        }, this);
                        while (models.length + realModels > 1)
                            coll.remove(models.shift());
                        if (models.length + realModels === 0)
                            coll.add(this._options.create_virtual.call(this._options.create_virtual_ctx || this, key));
                    }, this);
                }
            },

            _mapValue: function(value) {
                if (this._options.map)
                    value = this._options.map.call(this._options.mapctx || this, value);
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
                        return !this._matchItem(item, this._options.sub_key ? key[this._options.sub_key] : key);
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
                    var add = item.get(this._options.foreign_attr || this._foreignTable().primary_key());
                    current.push(this._options.sub_key ? Objs.objectBy(this._options.sub_key, add) : add);
                    if (this._options.create_virtual && this.collection.value())
                        this.collection.value().add(item);
                    this._model.set(fk, current);
                }
            }

        };
    });
});