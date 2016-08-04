Scoped.define("module:Modelling.ModelException", [
                                                  "base:Exceptions.Exception"
                                                  ], function (Exception, scoped) {
	return Exception.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (model, message) {
				inherited.constructor.call(this, message);
				this.__model = model;
			},

			model: function () {
				return this.__model;
			}

		};
	});
});


Scoped.define("module:Modelling.ModelMissingIdException", [
                                                           "module:Modelling.ModelException"
                                                           ], function (Exception, scoped) {
	return Exception.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (model) {
				inherited.constructor.call(this, model, "No id given.");
			}

		};
	});
});


Scoped.define("module:Modelling.ModelInvalidException", [
                                                         "module:Modelling.ModelException",
                                                         "base:Objs"
                                                         ], function (Exception, Objs, scoped) {
	return Exception.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (model, err) {
				var message = Objs.values(model.errors()).join("\n") || err;
				inherited.constructor.call(this, model, message);
			}

		};
	});
});
