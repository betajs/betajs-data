Scoped.define("module:Modelling.Table", [
    "base:Class",
    "base:Events.EventsMixin",
    "base:Objs",
    "base:Types",
    "base:Iterators.MappedIterator",
    "base:Classes.ObjectCache",
    "base:Promise"
], function(Class, EventsMixin, Objs, Types, MappedIterator, ObjectCache, Promise, scoped) {
    return Class.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {
        return {

            constructor: function(store, model_type, options) {
                inherited.constructor.call(this);
                this.__store = store;
                this.__model_type = model_type;
                this.__options = Objs.extend({
                    // Attribute that describes the type
                    type_column: null,
                    // Creation options
                    auto_create: false,
                    // Update options
                    auto_update: true,
                    // Save invalid
                    save_invalid: false,
                    // Cache Models
                    cache_models: false,

                    can_weakly_remove: false,

                    active_models: true
                }, options || {});
                this.__store.on("insert", function(obj) {
                    this.trigger("create", obj);
                }, this);
                this.__store.on("update", function(row, data) {
                    var id = row[this.primary_key()];
                    this.trigger("update", id, data, row);
                    this.trigger("update:" + id, data);
                }, this);
                this.__store.on("remove", function(id, ctx, data) {
                    this.trigger("remove", id, ctx, data);
                    this.trigger("remove:" + id, ctx, data);
                }, this);
                if (this.__options.cache_models) {
                    this.model_cache = this.auto_destroy(new ObjectCache(function(model) {
                        return model.id();
                    }));
                }
            },

            modelClass: function(cls) {
                cls = cls || this.__model_type;
                return Types.is_string(cls) ? Scoped.getGlobal(cls) : cls;
            },

            newModel: function(attributes, cls, ctx) {
                cls = this.modelClass(cls);
                var model = new cls(attributes, this, {}, ctx);
                if (this.__options.auto_create)
                    model.save();
                if (this.model_cache) {
                    if (model.hasId())
                        this.model_cache.register(model);
                    else {
                        model.once("save", function() {
                            this.model_cache.register(model);
                        }, this);
                    }
                }
                return model;
            },

            materialize: function(obj, ctx) {
                if (!obj)
                    return null;
                var cls = this.modelClass(this.__options.type_column && obj[this.__options.type_column] ? this.__options.type_column : null);
                if (this.model_cache) {
                    var cachedModel = this.model_cache.get(obj[this.primary_key()]);
                    if (cachedModel) {
                        cachedModel.setAll(obj);
                        return cachedModel;
                    }
                }
                var model = new cls(obj, this, {
                    newModel: false
                }, ctx);
                if (this.model_cache)
                    this.model_cache.register(model);
                return model;
            },

            options: function() {
                return this.__options;
            },

            store: function() {
                return this.__store;
            },

            findById: function(id, ctx) {
                return this.__store.get(id, ctx).mapSuccess(function(obj) {
                    return this.materialize(obj, ctx);
                }, this);
            },

            findByIdStrict: function(id, ctx) {
                return this.findById(id, ctx).mapSuccess(function(result) {
                    return result || Promise.error("Not found");
                });
            },

            findBy: function(query, options, ctx) {
                return this.allBy(query, Objs.extend({
                    limit: 1
                }, options), ctx).mapSuccess(function(iter) {
                    var item = iter.next();
                    iter.destroy();
                    return item;
                });
            },

            findByStrict: function(query, options, ctx) {
                return this.findBy(query, options, ctx).mapSuccess(function(result) {
                    return result || Promise.error("Not found");
                });
            },

            allBy: function(query, options, ctx) {
                return this.__store.query(query, options, ctx).mapSuccess(function(iterator) {
                    return (new MappedIterator(iterator, function(obj) {
                        return this.materialize(obj, ctx);
                    }, this)).auto_destroy(iterator, true);
                }, this);
            },

            primary_key: function() {
                return (Types.is_string(this.__model_type) ? Scoped.getGlobal(this.__model_type) : this.__model_type).primary_key();
            },

            all: function(options, ctx) {
                return this.allBy({}, options, ctx);
            },

            query: function() {
                // Alias
                return this.allBy.apply(this, arguments);
            },

            scheme: function() {
                return this.__model_type.scheme();
            },

            ensure_indices: function() {
                if (!("ensure_index" in this.__store))
                    return false;
                var scheme = this.scheme();
                for (var key in scheme) {
                    if (scheme[key].index)
                        this.__store.ensure_index(key);
                }
                return true;
            }

        };
    }]);
});