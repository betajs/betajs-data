           QUnit.test("test schemed prop length validation from null", function (assert) {
	var done = assert.async();
	var done1 = assert.async();
	var done2 = assert.async();
	var schemedProp = BetaJS.Data.Modelling.SchemedProperties.extend(null, {}, function (inherited) {
		return {
			_initializeScheme: function () {
				var scheme = inherited._initializeScheme.call(this);
				scheme.example_property = {
					type: "string",
					validate: new BetaJS.Data.Modelling.Validators.LengthValidator({max_length: 8})
				};
				return scheme;
			}
		};
	});
	
	var example = new schemedProp({"example_property": null});
	example.validate().mapSuccess(function (val) {
		assert.ok(val);
		done();
	}).mapError(function () {
		assert.ok(false);
		done();
	});
	example.set("example_property", "value");
	example.validate().mapSuccess(function (val) {
		assert.ok(val);
		done1();
	}).mapError(function () {
		assert.ok(false);
		done1();
	});
	
	example.set("example_property", "length overflow");
	example.validate().mapSuccess(function (val) {
		assert.ok(!val);
		done2();
	}).mapError(function () {
		assert.ok(false);
		done2();
	});
});


QUnit.test("test schemed prop length validation from min", function (assert) {
	var done = assert.async();
	var done1 = assert.async();
	var done2 = assert.async();
	var schemedProp = BetaJS.Data.Modelling.SchemedProperties.extend(null, {}, function (inherited) {
		return {
			_initializeScheme: function () {
				var scheme = inherited._initializeScheme.call(this);
				scheme.example_property = {
					type: "string",
					validate: new BetaJS.Data.Modelling.Validators.LengthValidator({min_length: 4, max_length: 8})
				};
				return scheme;
			}
		};
	});
	
	var example = new schemedProp({"example_property": null});
	example.validate().mapSuccess(function (val) {
		assert.ok(!val);
		done();
	}).mapError(function () {
		assert.ok(false);
		done();
	});
	example.set("example_property", "value");
	example.validate().mapSuccess(function (val) {
		assert.ok(val);
		done1();
	}).mapError(function () {
		assert.ok(false);
		done1();
	});
	
	example.set("example_property", "bad");
	example.validate().mapSuccess(function (val) {
		assert.ok(!val);
		done2();
	}).mapError(function () {
		assert.ok(false);
		done2();
	});
});


QUnit.test("test schemed prop length validation max action", function (assert) {
	var done = assert.async();
	var done1 = assert.async();
	var done2 = assert.async();
	var schemedProp = BetaJS.Data.Modelling.SchemedProperties.extend(null, {}, function (inherited) {
		return {
			_initializeScheme: function () {
				var scheme = inherited._initializeScheme.call(this);
				scheme.first_prop = {
					type: "string",
					validate: new BetaJS.Data.Modelling.Validators.LengthValidator({min_length: 4, max_length: 5, max_action: "truncate"})
				};
				scheme.second_prop = {
					type: "string",
					validate: new BetaJS.Data.Modelling.Validators.LengthValidator({min_length: null, max_length: 8, max_action: "empty"})
				};
				scheme.third_prop = {
					type: "string",
					validate: new BetaJS.Data.Modelling.Validators.LengthValidator({min_length: 4, max_length: 10})
				};
				return scheme;
			}
		};
	});
	
	var example = new schemedProp({"first_prop": "valueeeeeeeee", "second_prop" : "iamgettingerased", "third_prop" : "something"});
	example.validate().mapSuccess(function (val) {
		assert.ok(val);
		done();
	}).mapError(function () {
		assert.ok(false);
		done();
	});
	
	var example2 = new schemedProp({"first_prop": "min", "second_prop" : "iamgettingerased"});
	example2.validate().mapSuccess(function (val) {
		assert.ok(!val);
		done1();
	}).mapError(function () {
		assert.ok(false);
		done1();
	});
	
	var example3 = new schemedProp({"first_prop": "valueeeeeeeee", "second_prop" : "iamgettingerased", "third_prop" : "verylongprop"});
	example3.validate().mapSuccess(function (val) {
		assert.ok(!val);
		done2();
	}).mapError(function () {
		assert.ok(false);
		done2();
	});
});

QUnit.test("test schemed prop value validation from null", function (assert) {
	var done = assert.async();
	var done1 = assert.async();
	var done2 = assert.async();
	var schemedProp = BetaJS.Data.Modelling.SchemedProperties.extend(null, {}, function (inherited) {
		return {
			_initializeScheme: function () {
				var scheme = inherited._initializeScheme.call(this);
				scheme.example_property = {
					type: "integer",
					validate: new BetaJS.Data.Modelling.Validators.MinMaxValidator({max_value: 8})
				};
				return scheme;
			}
		};
	});

	var example = new schemedProp({"example_property": null});
	example.validate().mapSuccess(function (val) {
		assert.ok(val);
		done();
	}).mapError(function () {
		assert.ok(false);
		done();
	});
	example.set("example_property", 5);
	example.validate().mapSuccess(function (val) {
		assert.ok(val);
		done1();
	}).mapError(function () {
		assert.ok(false);
		done1();
	});

	example.set("example_property", 9);
	example.validate().mapSuccess(function (val) {
		assert.ok(!val);
		done2();
	}).mapError(function () {
		assert.ok(false);
		done2();
	});
});

QUnit.test("test schemed prop value validation from min", function (assert) {
	var done = assert.async();
	var done1 = assert.async();
	var done2 = assert.async();
	var schemedProp = BetaJS.Data.Modelling.SchemedProperties.extend(null, {}, function (inherited) {
		return {
			_initializeScheme: function () {
				var scheme = inherited._initializeScheme.call(this);
				scheme.example_property = {
					type: "string",
					validate: new BetaJS.Data.Modelling.Validators.MinMaxValidator({min_value: 4, max_value: 8})
				};
				return scheme;
			}
		};
	});

	var example = new schemedProp({"example_property": 4});
	example.validate().mapSuccess(function (val) {
		assert.ok(val);
		done();
	}).mapError(function () {
		assert.ok(false);
		done();
	});
	example.set("example_property", 5);
	example.validate().mapSuccess(function (val) {
		assert.ok(val);
		done1();
	}).mapError(function () {
		assert.ok(false);
		done1();
	});

	example.set("example_property", 2);
	example.validate().mapSuccess(function (val) {
		assert.ok(!val);
		done2();
	}).mapError(function () {
		assert.ok(false);
		done2();
	});
});

QUnit.test("test schemed prop regex validation using test", function (assert) {
	var done = assert.async();
	var done1 = assert.async();
	var done2 = assert.async();
	var done3 = assert.async();
	var schemedProp = BetaJS.Data.Modelling.SchemedProperties.extend(null, {}, function (inherited) {
		return {
			_initializeScheme: function () {
				var scheme = inherited._initializeScheme.call(this);
				scheme.example_property = {
					type: "string",
					validate: new BetaJS.Data.Modelling.Validators.RegexValidator({regex: '^\\b([A-Z0-9])+\\b$', use_function: 'test'})
				};
				return scheme;
			}
		};
	});

	var example = new schemedProp({"example_property": "TESTABC"});
	example.validate().mapSuccess(function (val) {
		assert.ok(val);
		done();
	}).mapError(function () {
		assert.ok(false);
		done();
	});
	example.set("example_property", "1234TEST");
	example.validate().mapSuccess(function (val) {
		assert.ok(val);
		done1();
	}).mapError(function () {
		assert.ok(false);
		done1();
	});

	example.set("example_property", "abcsdcs");
	example.validate().mapSuccess(function (val) {
		assert.ok(!val);
		done2();
	}).mapError(function () {
		assert.ok(false);
		done2();
	});

	example.set("example_property", "ABC 123");
	example.validate().mapSuccess(function (val) {
		assert.ok(!val);
		done3();
	}).mapError(function () {
		assert.ok(false);
		done3();
	});
});

QUnit.test("test schemed prop regex validation using match", function (assert) {
	var done = assert.async();
	var done1 = assert.async();
	var done2 = assert.async();
	var done3 = assert.async();
	var schemedProp = BetaJS.Data.Modelling.SchemedProperties.extend(null, {}, function (inherited) {
		return {
			_initializeScheme: function () {
				var scheme = inherited._initializeScheme.call(this);
				scheme.example_property = {
					type: "string",
					validate: new BetaJS.Data.Modelling.Validators.RegexValidator({regex: '[A-Z0-9]', use_function: 'test'})
				};
				return scheme;
			}
		};
	});

	var example = new schemedProp({"example_property": "TESTABC"});
	example.validate().mapSuccess(function (val) {
		assert.ok(val);
		done();
	}).mapError(function () {
		assert.ok(false);
		done();
	});
	example.set("example_property", "1234TEST");
	example.validate().mapSuccess(function (val) {
		assert.ok(val);
		done1();
	}).mapError(function () {
		assert.ok(false);
		done1();
	});

	example.set("example_property", "abcsdc s");
	example.validate().mapSuccess(function (val) {
		assert.ok(!val);
		done2();
	}).mapError(function () {
		assert.ok(false);
		done2();
	});

	example.set("example_property", "ABC 123");
	example.validate().mapSuccess(function (val) {
		assert.ok(val);
		done3();
	}).mapError(function () {
		assert.ok(false);
		done3();
	});
});