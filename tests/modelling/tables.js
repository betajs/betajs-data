QUnit.test("test tables findById", function (assert) {
	var store = new BetaJS.Data.Stores.MemoryStore();
	var Model = BetaJS.Data.Modelling.Model.extend("Model", {});
	var table = new BetaJS.Data.Modelling.Table(store, Model, {});	
	var model = table.newModel();
	model.save();
	assert.ok(table.findById(model.id()).value() !== null);
	assert.equal(table.findById(model.id() + 1).value(), null);
});


QUnit.test("test tables all", function (assert) {
	var store = new BetaJS.Data.Stores.MemoryStore();
	var Model = BetaJS.Data.Modelling.Model.extend("Model", {});
	var table = new BetaJS.Data.Modelling.Table(store, Model, {});
	var created = 0;
	table.on("create", function (obj) {
		created++;
	});
	var model = table.newModel();
	model.save();
	var models = table.all().value().asArray();
	assert.equal(models.length, 1);
	assert.equal(models[0].id(), model.id());
	assert.equal(created, 1);
});

QUnit.test("test tables all async", function (assert) {
	var store = new BetaJS.Data.Stores.MemoryStore();
	var Model = BetaJS.Data.Modelling.Model.extend("Model", {});
	var table = new BetaJS.Data.Modelling.Table(store, Model, {});
	var model = table.newModel();
	model.save();
	table.all().success(function (result) {
		var models = result.asArray();
		assert.equal(models.length, 1);
		assert.equal(models[0].id(), model.id());
	});
});

QUnit.test("test tables findBy", function (assert) {
	var store = new BetaJS.Data.Stores.MemoryStore();
	var Model = BetaJS.Data.Modelling.Model.extend("Model", {});
	var table = new BetaJS.Data.Modelling.Table(store, Model, {});
	var model = table.newModel();
	model.save();
	var model2 = table.findBy({}).value();
	assert.equal(model2.id(), model.id());
});

QUnit.test("test tables sync changes", function (assert) {
    var store = new BetaJS.Data.Stores.MemoryStore();
    var Model = BetaJS.Data.Modelling.Model.extend("Model", {}, {
        _initializeScheme: function () {
            return BetaJS.Objs.extend({
                value: {}
            }, this._inherited(Model, "_initializeScheme"));
        }
    });
    var table = new BetaJS.Data.Modelling.Table(store, Model, {});
    var model1 = table.newModel({
		value: "foo"
	});
    model1.save();
    var model2 = table.findById(model1.id()).value();
    assert.equal(model2.get("value"), "foo");
    model2.set("value", "bar");
    assert.equal(model1.get("value"), "bar");
    model1.set("value", "baz");
    assert.equal(model2.get("value"), "baz");
    model1.set("value", "bang");
    assert.equal(model2.get("value"), "bang");
});