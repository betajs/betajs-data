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
                this.__function = options.use_function ? options.use_function : "test";
                this.__error_string = options.error_string ? options.error_string : "String doesn't match regular expression.";
            },

            validate: function(value, context) {
                if (!this.__regex)
                    return "You must add a regex to use this validator.";
                if (["test", "match"].indexOf(this.__function) === -1)
                    return "You must choose between 'test' and 'match' to validate the regex.";
                if (this.__function === "test")
                    return this.__regex.test(value) ? null : this.__error_string;
                if (this.__function === "match")
                    return value.match(this.__regex) ? null : this.__error_string;
                return this.__error_string;
            }

        };
    });
});