Scoped.define('module:Modelling.Validators.MinMaxValidator', [
    'module:Modelling.Validators.Validator',
    'base:Types',
    'base:Objs'
], function(Validator, Types, Objs, scoped) {
    return Validator.extend({
        scoped: scoped
    }, function(inherited) {
        return {
            constructor: function(options) {
                inherited.constructor.call(this);
                options = Objs.extend({
                    min_value: null,
                    max_value: null,
                    error_string: null
                }, options);
                if (options.min_value && !Types.isNumber(options.min_value))
                    throw new Error('Min value must be a number.');
                if (options.max_value && !Types.isNumber(options.max_value))
                    throw new Error('Max value must be a number.');
                this.__min_value = options.min_value;
                this.__max_value = options.max_value;
                this.__error_string = options.error_string;
                if (!this.__error_string) {
                    if (this.__min_value !== null) {
                        if (this.__max_value !== null) {
                            this.__error_string = 'Between ' + this.__min_value + ' and ' + this.__max_value;
                        } else {
                            this.__error_string = 'At least ' + this.__min_value;
                        }
                    } else if (this.__max_value !== null)
                        this.__error_string = 'At most ' + this.__max_value;
                }
            },

            validate: function(value, context, key) {
                if (!Types.isNumber(value))
                    throw new Error('MinMax Validator is for numbers only.');
                if (this.__min_value !== null && (!value || (value < this.__min_value))) {
                    return this.__error_string;
                }
                if (this.__max_value !== null && (value && (value > this.__max_value))) {
                    return this.__error_string;
                }
                return null;
            }
        };
    });
});