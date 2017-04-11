Scoped.define("module:Modelling.Validators.EmailValidator", [
    "module:Modelling.Validators.Validator",
    "base:Strings"
], function(Validator, Strings, scoped) {
    return Validator.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(error_string) {
                inherited.constructor.call(this);
                this.__error_string = error_string ? error_string : "Not a valid email address";
            },

            validate: function(value, context) {
                return Strings.is_email_address(value) ? null : this.__error_string;
            }

        };
    });
});