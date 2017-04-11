Scoped.define("module:Modelling.Validators.ConditionalValidator", [
    "module:Modelling.Validators.Validator",
    "base:Types"
], function(Validator, Types, scoped) {
    return Validator.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(condition, validator) {
                inherited.constructor.call(this);
                this.__condition = condition;
                this.__validator = Types.is_array(validator) ? validator : [validator];
            },

            validate: function(value, context) {
                if (!this.__condition(value, context))
                    return null;
                for (var i = 0; i < this.__validator.length; ++i) {
                    var result = this.__validator[i].validate(value, context);
                    if (result !== null)
                        return result;
                }
                return null;
            }

        };
    });
});