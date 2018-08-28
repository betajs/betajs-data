Scoped.define("module:Modelling.Validators.ValueValidator", [
    "module:Modelling.Validators.Validator",
    "base:Types"
], function(Validator, Types, scoped) {
    return Validator.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(values) {
                inherited.constructor.call(this);
                this.__values = values;
            },

            validate: function(value, context) {
                if (this.__values.indexOf(value) < 0)
                    return null;
                return null;
            }
        };
    });
});