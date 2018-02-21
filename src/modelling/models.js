Scoped.define("module:Modelling.Model", [
    "module:Modelling.AssociatedProperties",
    "module:Modelling.ModelInvalidException",
    "base:Objs",
    "base:Promise",
    "base:Types",
    "base:Strings",
    "module:Modelling.Table"
], function(AssociatedProperties, ModelInvalidException, Objs, Promise, Types, Strings, Table, scoped) {
    return AssociatedProperties.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(attributes, table, options, ctx) {
                this.__table = table;
                this.__options = Objs.extend({
                    newModel: true,
                    removed: false
                }, options);
                this.__ctx = ctx;
                this.__silent = 1;
                inherited.constructor.call(this, attributes);
                this.__silent = 0;
                if (!this.isNew()) {
                    this._properties_changed = {};
                    this._registerEvents();
                }
                if (this.option("auto_create") && this.isNew())
                    this.save();
            },

            destroy: function() {
                this.__table.off(null, null, this);
                this.trigger("destroy");
                inherited.destroy.call(this);
            },

            saveOnChange: function(weak) {
                this.__saveOnChange = true;
                this.__saveOnChangeWeak = !!weak;
                return this;
            },

            option: function(key) {
                var opts = key in this.__options ? this.__options : this.table().options();
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

            _registerEvents: function() {
                this.__table.on("update:" + this.id(), function(data) {
                    if (this.isRemoved())
                        return;
                    this.__silent++;
                    for (var key in data) {
                        if (!this._properties_changed[key]) {
                            this.set(key, data[key]);
                            delete this._properties_changed[key];
                        }
                    }
                    this.__silent--;
                }, this);
                this.__table.on("remove:" + this.id(), function() {
                    if (this.isRemoved())
                        return;
                    this.trigger("remove");
                    this.__options.removed = true;
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
                if (this.option("auto_update") && (!this.isNew() || (this.__saveOnChange && (!this.__saveOnChangeWeak || !!value))))
                    this.save();
            },

            save: function() {
                if (this.isRemoved())
                    return Promise.create({});
                var promise = this.option("save_invalid") ? Promise.value(true) : this.validate();
                return promise.mapSuccess(function(valid) {
                    if (!valid)
                        return Promise.create(null, new ModelInvalidException(this));
                    var attrs;
                    if (this.isNew()) {
                        attrs = this.cls.filterPersistent(this.get_all_properties());
                        if (this.__options.type_column)
                            attrs[this.__options.type_column] = this.cls.classname;
                    } else {
                        attrs = this.cls.filterPersistent(this.properties_changed());
                        if (Types.is_empty(attrs))
                            return Promise.create(attrs);
                    }
                    var wasNew = this.isNew();
                    var promise = this.isNew() ? this.__table.store().insert(attrs, this.__ctx) : this.__table.store().update(this.id(), attrs, this.__ctx);
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

            remove: function() {
                if (this.isNew() || this.isRemoved())
                    return Promise.create(true);
                this.__removing = true;
                return this.__table.store().remove(this.id(), this.__ctx).callback(function() {
                    this.__removing = false;
                }, this).success(function() {
                    if (this.destroyed())
                        return;
                    this.__options.removed = true;
                    this.trigger("remove");
                }, this);
            }

        };
    }, {

        type: function() {
            return Strings.last_after(this.classname, ".").toLowerCase();
        },

        createTable: function(store, options) {
            return new Table(store, this, options);
        }

    });
});