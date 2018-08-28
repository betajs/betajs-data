Scoped.define("module:Modelling.Validators.UniqueValidator", [
    "module:Modelling.Validators.Validator"
], function(Validator, scoped) {
    return Validator.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(key, error_string, ignore_if_null, query) {
                inherited.constructor.call(this);
                this.__key = key;
                this.__error_string = error_string ? error_string : "Key already present";
                this.__ignore_if_null = ignore_if_null;
                this.__query = query;
            },

            validate: function(value, context) {
                if (value == null && this.__ignore_if_null)
                    return null;
                var query = {};
                query[this.__key] = value;
                if (this.__query && Array.isArray(this.__query)) {
                    this.__query.forEach(function(element) {
                        if (element !== this.__key)
                            query[element] = context.get(element);
                    }, this);
                }
                return context.table().findBy(query).mapSuccess(function(item) {
                    return (!item || (!context.isNew() && context.id() == item.id())) ? null : this.__error_string;
                }, this);
            }

        };
    });
});