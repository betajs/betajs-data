Scoped.define("module:Modelling.SchemedProperties", [
    "base:Properties.Properties",
    "base:Types",
    "base:Promise",
    "base:Objs"
], function(Properties, Types, Promise, Objs, scoped) {
    return Properties.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(attributes) {
                inherited.constructor.call(this);
                var scheme = this.cls.scheme();
                this._properties_changed = {};
                this.__errors = {};
                for (var key in scheme)
                    this.set(key, this._defaultForKey(scheme[key], attributes));
                this._properties_changed = {};
                this.__errors = {};
                for (key in attributes)
                    this.set(key, attributes[key]);
            },

            _defaultForKey: function(schemeValue, attributes) {
                if ("def" in schemeValue)
                    return Types.is_function(schemeValue.def) ? schemeValue.def(attributes) : schemeValue.def;
                else if (schemeValue.auto_create)
                    return schemeValue.auto_create(this);
                return null;
            },

            _unsetChanged: function(key) {
                delete this._properties_changed[key];
            },

            _beforeSet: function(key, value, oldValue) {
                var scheme = this.cls.scheme();
                if (!(key in scheme))
                    return value;
                var sch = scheme[key];
                if (sch.type)
                    value = Types.parseType(value, sch.type);
                if (sch.transform)
                    value = sch.transform.call(this, value, oldValue);
                return value;
            },

            _afterSet: function(key, value) {
                var scheme = this.cls.scheme();
                if (!(key in scheme))
                    return;
                this._properties_changed[key] = value;
                delete this.__errors[key];
                if (scheme[key].after_set) {
                    var f = Types.is_string(scheme[key].after_set) ? this[scheme[key].after_set] : scheme[key].after_set;
                    f.apply(this, [value]);
                }
            },

            isChanged: function() {
                return !Types.is_empty(this._properties_changed);
            },

            properties_changed: function() {
                return this._properties_changed;
            },

            get_all_properties: function() {
                var result = {};
                var scheme = this.cls.scheme();
                for (var key in scheme)
                    result[key] = this.get(key);
                return result;
            },

            validate: function() {
                this.trigger("validate");
                var promises = [];
                for (var key in this.cls.scheme())
                    promises.push(this._validateAttr(key));
                promises.push(Promise.box(this._customValidate, this));
                return Promise.and(promises).end().mapSuccess(function(arr) {
                    var valid = true;
                    Objs.iter(arr, function(entry) {
                        valid = valid && entry;
                    });
                    return valid;
                });
            },

            _customValidate: function() {
                return true;
            },

            _validateAttr: function(attr) {
                delete this.__errors[attr];
                var scheme = this.cls.scheme();
                var entry = scheme[attr];
                var validate = entry.validate;
                if (!validate)
                    return Promise.value(true);
                if (!Types.is_array(validate))
                    validate = [validate];
                var value = this.get(attr);
                var promises = [];
                Objs.iter(validate, function(validator) {
                    promises.push(Promise.box(validator.validate, validator, [value, this, attr]));
                }, this);
                return Promise.and(promises).end().mapSuccess(function(arr) {
                    var valid = true;
                    Objs.iter(arr, function(entry) {
                        if (entry !== null) {
                            valid = false;
                            this.__errors[attr] = entry;
                        }
                    }, this);
                    this.trigger("validate:" + attr, valid, this.__errors[attr]);
                    return valid;
                }, this);
            },

            setError: function(attr, error) {
                this.__errors[attr] = error;
                this.trigger("validate:" + attr, !(attr in this.__errors), this.__errors[attr]);
            },

            errors: function() {
                return this.__errors;
            },

            getError: function(attr) {
                return this.__errors[attr];
            },

            asRecord: function(tags) {
                var rec = {};
                var scheme = this.cls.scheme();
                var props = this.get_all_properties();
                tags = tags || [];
                var asInner = function(key) {
                    var target = scheme[key].tags || [];
                    var tarobj = {};
                    Objs.iter(target, function(value) {
                        tarobj[value] = true;
                    });
                    var success = true;
                    Objs.iter(tags, function(x) {
                        success = success && x in tarobj;
                    }, this);
                    if (success)
                        rec[key] = props[key];
                };
                for (var key in props)
                    if (key in scheme)
                        asInner.call(this, key);
                return rec;
            },

            setByTags: function(data, tags) {
                var scheme = this.cls.scheme();
                tags = tags || {};
                var setInner = function(key) {
                    var target = scheme[key].tags || [];
                    var tarobj = {};
                    Objs.iter(target, function(value) {
                        tarobj[value] = true;
                    });
                    var success = true;
                    Objs.iter(tags, function(x) {
                        success = success && x in tarobj;
                    }, this);
                    if (success)
                        this.set(key, data[key]);
                };
                for (var key in data)
                    if (key in scheme)
                        setInner.call(this, key);
            },

            isEmpty: function() {
                var empty = true;
                var attrs = this.getAll();
                Objs.iter(this.cls.scheme(), function(value, key) {
                    empty = empty && (value.ignore_for_emptiness || this._defaultForKey(value, attrs) === attrs[key]);
                }, this);
                return empty;
            }

        };
    }, {

        _initializeScheme: function() {
            return {};
        },

        asRecords: function(arr, tags) {
            return arr.map(function(item) {
                return item.asRecord(tags);
            });
        },

        filterPersistent: function(obj) {
            var result = {};
            var scheme = this.scheme();
            for (var key in obj) {
                if ((!Types.is_defined(scheme[key].persistent) || scheme[key].persistent) && (Types.is_defined(obj[key])))
                    result[key] = obj[key];
            }
            return result;
        }

    }, {

        scheme: function() {
            this.__scheme = this.__scheme || this._initializeScheme();
            return this.__scheme;
        }

    });
});


Scoped.define("module:Modelling.AssociatedProperties", [
    "module:Modelling.SchemedProperties",
    "base:Objs"
], function(SchemedProperties, Objs, scoped) {
    return SchemedProperties.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(attributes) {
                inherited.constructor.call(this, attributes);
                this.assocs = this._initializeAssociations();
            },

            _initializeAssociations: function() {
                return {};
            },

            destroy: function() {
                Objs.iter(this.assocs, function(assoc) {
                    if (assoc && assoc.weakDestroy)
                        assoc.weakDestroy();
                });
                inherited.destroy.call(this);
            },

            id: function() {
                return this.get(this.cls.primary_key());
            },

            pid: function() {
                return this.id();
            },

            hasId: function() {
                return this.has(this.cls.primary_key()) && this.get(this.cls.primary_key()) !== null;
            }

        };

    }, {

        primary_key: function() {
            return "id";
        },

        _initializeScheme: function() {
            var s = {};
            s[this.primary_key()] = {
                type: "id",
                tags: ["read"],

                after_set: null,
                persistent: true,
                ignore_for_emptiness: true
            };
            return s;
        }

    });
});