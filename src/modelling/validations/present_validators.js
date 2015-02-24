Scoped.define("module:Modelling.Validators.PresentValidator", [
        "module:Modelling.Validators.Validator",
        "base:Types"
    ], function (Validator, Types, scoped) {
    return Validator.extend({scoped: scoped}, function (inherited) {
		return {
			
			constructor: function (error_string) {
				inherited.constructor.call(this);
				this.__error_string = error_string ? error_string : "Field is required";
			},
		
			validate: function (value, context) {
				return Types.is_null(value) || value === "" ? this.__error_string : null;
			}

		};
    });
});