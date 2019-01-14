Scoped.define("module:Modelling.Validators.RegexValidator", [
    "module:Modelling.Validators.Validator",
    "base:Strings"
], function(Validator, Strings, scoped) {
    return Validator.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(options) {
                inherited.constructor.call(this);
                this.__regex = options.regex ? new RegExp(options.regex) : null;
                this.__error_string = options.error_string ? options.error_string : "String doesn't match regular expression.";
            },

            validate: function(value, context) {
                if (!this.__regex)
                    return "You must add a regex to use this validator.";
                return this.__regex.match(value) ? null : this.__error_string;
            }

        };
    });
});