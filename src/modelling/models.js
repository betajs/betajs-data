Scoped.define("module:Modelling.Model", [
    "module:Modelling.AssociatedProperties",
    "base:Events.HooksMixin",
    "module:Modelling.ModelInvalidException",
    "base:Objs",
    "base:Promise",
    "base:Types",
    "base:Strings",
    "module:Modelling.Table"
], function(AssociatedProperties, HooksMixin, ModelInvalidException, Objs, Promise, Types, Strings, Table, scoped) {
    return AssociatedProperties.extend({
        scoped: scoped
    }, [HooksMixin, function(inherited) {
        return {

            constructor: function(attributes, table, options, ctx) {
                this.__table = table;
                this.__options = Objs.extend({
                    newModel: true,
                    removed: false,
                    canWeaklyRemove: false
                }, options);
                this.__ctx = ctx;
                this.__silent = 1;
                inherited.constructor.call(this, attributes);
                this.__silent = 0;
                this.__removeOnDestroy = false;
                if (!this.isNew()) {
                    this._properties_changed = {};
                    this._registerEvents();
                }
                if (this.option("auto_create") && this.isNew())
                    this.save();
                this.registerHook("beforeRemove", function() {
                    return BetaJS.Promise.value(true);
                });
            },

            destroy: function() {
                if (this.__removeOnDestroy)
                    this.remove();
                if (this.__removeOnDestroyIfEmpty)
                    this.removeIfEmpty();
                if (this.table())
                    this.table().off(null, null, this);
                this.trigger("destroy");
                inherited.destroy.call(this);
            },

            ctx: function() {
                return this.__ctx;
            },

            saveOnChange: function(weak) {
                this.__saveOnChange = true;
                this.__saveOnChangeWeak = !!weak;
                return this;
            },

            disableSaveOnChange: function() {
                this.__disableSaveOnChange = true;
            },

            enableSaveOnChange: function() {
                this.__disableSaveOnChange = false;
            },

            option: function(key) {
                var opts = key in this.__options || !this.table() ? this.__options : this.table().options();
                return opts[key];
            },

            type: function() {
                return this.cls.type();
            },

            table: function() {
                return this.__table;
            },

            isSaved: function() {
                return this.isRemoved() || (!this.isNew() && !this.isChanged());
            },

            isNew: function() {
                return this.option("newModel");
            },

            isRemoved: function() {
                return this.option("removed");
            },

            setAllNoChange: function(data) {
                this.__silent++;
                for (var key in data) {
                    if (!this._properties_changed[key]) {
                        this.set(key, data[key]);
                        delete this._properties_changed[key];
                    }
                }
                this.__silent--;
            },

            _registerEvents: function() {
                if (!this.table().options().active_models)
                    return;
                this.__table.on("update:" + this.id(), function(data, row, pre_data) {
                    if (this.isRemoved())
                        return;
                    this.setAllNoChange(data);
                }, this);
                this.__table.on("remove:" + this.id(), function() {
                    if (this.isRemoved())
                        return;
                    this.__options.removed = true;
                    this.trigger("remove");
                }, this);
            },

            update: function(data) {
                this.__silent++;
                this.suspendEvents();
                this.setAll(data);
                this.__silent--;
                var promise = this.isNew() ? Promise.create(true) : this.save();
                return promise.callback(this.resumeEvents, this);
            },

            _afterSet: function(key, value, old_value, options) {
                inherited._afterSet.call(this, key, value, old_value, options);
                var scheme = this.cls.scheme();
                if (!(key in scheme) || this.__silent > 0)
                    return;
                if (this.option("auto_update") && (!this.isNew() || (!this.__disableSaveOnChange && this.__saveOnChange && (!this.__saveOnChangeWeak || !!value))))
                    this.save();
            },

            save: function(transaction_id) {
                if (this.isRemoved())
                    return Promise.create({});
                var promise = this.option("save_invalid") ? Promise.value(true) : this.validate();
                return promise.mapSuccess(function(valid) {
                    if (!valid)
                        return Promise.create(null, new ModelInvalidException(this));
                    var attrs;
                    if (this.isNew()) {
                        attrs = this.cls.filterPersistent(this.get_all_properties());
                        if (this.option("type_column")) {
                            var classname = this.cls.classname;
                            var column = this.option("type_column");
                            var type = this.get(column);
                            if (this.option("types") && typeof this.option("types") === "object") {
                                if (this.option("types")[type]) {
                                    classname = type;
                                } else {
                                    Objs.iter(Objs.values(this.option("types")), function(item) {
                                        if (this instanceof item)
                                            classname = item;
                                    }, this);
                                }
                            }
                            attrs[this.option("type_column")] = classname;
                        }
                    } else {
                        attrs = this.cls.filterPersistent(this.properties_changed());
                        if (Types.is_empty(attrs))
                            return Promise.create(attrs);
                    }
                    var wasNew = this.isNew();
                    var promise = this.isNew() ? this.__table._insertModel(attrs, this.__ctx) : this.__table._updateModel(this.id(), attrs, this.__ctx, transaction_id);
                    return promise.mapCallback(function(err, result) {
                        if (this.destroyed())
                            return this;
                        if (err) {
                            if (err.data) {
                                Objs.iter(err.data, function(value, key) {
                                    this.setError(key, value);
                                }, this);
                            }
                            return new ModelInvalidException(this, err);
                        }
                        this.__silent++;
                        this.setAll(result);
                        this.__silent--;
                        this._properties_changed = {};
                        this.trigger("save");
                        if (wasNew) {
                            this.__options.newModel = false;
                            this._registerEvents();
                            this._createdModel();
                        }
                        return this;
                    }, this);
                }, this);
            },

            _createdModel: function() {},

            isRemoving: function() {
                return this.__removing;
            },

            canWeaklyRemove: function() {
                return this.option('can_weakly_remove');
            },

            weaklyRemove: function() {
                return this.canWeaklyRemove() ? this.remove() : Promise.error("Cannot remove weakly");
            },

            remove: function() {
                if (this.isNew() || this.isRemoved())
                    return Promise.create(true);
                this.__removing = true;
                this.invokeHook("beforeRemove");
                return this.__table.store().remove(this.id(), this.__ctx).callback(function() {
                    this.__removing = false;
                }, this).mapSuccess(function(result) {
                    if (this.destroyed())
                        return result;
                    this.__options.removed = true;
                    this.trigger("remove");
                    return this.invokeHook("remove", result);
                }, this);
            },

            removeOnDestroy: function() {
                this.__removeOnDestroy = true;
                return this;
            },

            removeIfEmpty: function() {
                if (this.isEmpty())
                    this.remove();
            },

            removeOnDestroyIfEmpty: function() {
                this.__removeOnDestroyIfEmpty = true;
                return this;
            },

            destroyOnRemove: function() {
                this.once("remove", this.weakDestroy, this);
                return this;
            }

        };
    }], {

        type: function() {
            return Strings.last_after(this.classname, ".").toLowerCase();
        },

        createTable: function(store, options) {
            return new Table(store, this, options);
        }

    });
});