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
