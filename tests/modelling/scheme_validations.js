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
