Scoped.define("module:Modelling.Validators.LengthValidator", [
    "module:Modelling.Validators.Validator",
    "base:Types",
    "base:Objs"
], function(Validator, Types, Objs, scoped) {
    return Validator.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(options) {
                inherited.constructor.call(this);
                options = Objs.extend({
                    min_length: null,
                    max_length: null,
                    error_string: null,
                    max_action: null
                }, options);
                this.__min_length = options.min_length;
                this.__max_length = options.max_length;
                this.__error_string = options.error_string;
                this.__max_action = options.max_action;
                if (!this.__error_string) {
                    if (this.__min_length !== null) {
                        if (this.__max_length !== null)
                            this.__error_string = "Between " + this.__min_length + " and " + this.__max_length + " characters";
                        else
                            this.__error_string = "At least " + this.__min_length + " characters";
                    } else if (this.__max_length !== null)
                        this.__error_string = "At most " + this.__max_length + " characters";
                }
            },

            validate: function(value, context, key) {
                if (this.__min_length !== null && (!value || (value && value.length < this.__min_length)))
                    return this.__error_string;
                var resp = null;
                if (this.__max_length !== null && (value && (value.length > this.__max_length))) {
                    resp = this.__error_string;
                    if (this.__max_action) {
                        switch (this.__max_action) {
                            case "truncate":
                                context.set(key, value.substr(0, this.__max_length));
                                resp = null;
                                break;
                            case "empty":
                                context.set(key, "");
                                resp = null;
                                break;
                            default:
                                break;
                        }
                    }
                }
                return resp;
            }

        };
    });
});