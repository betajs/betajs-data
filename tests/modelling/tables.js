test("test tables findById", function() {
	var store = new BetaJS.Stores.MemoryStore();
	var Model = BetaJS.Modelling.Model.extend("Model", {});
	var table = new BetaJS.Modelling.Table(store, Model, {});	
	var model = table.newModel();
	model.save();
	ok(table.findById(model.id()).value() != null);
	QUnit.equal(table.findById(model.id() + 1).value(), null);
});


test("test tables all", function() {
	var store = new BetaJS.Stores.MemoryStore();
	var Model = BetaJS.Modelling.Model.extend("Model", {});
	var table = new BetaJS.Modelling.Table(store, Model, {});
	var created = 0;
	table.on("create", function (obj) {
		created++;
	});
	var model = table.newModel();
	model.save();
	var models = table.all().value().asArray();
	QUnit.equal(models.length, 1);
	QUnit.equal(models[0].id(), model.id());
	QUnit.equal(created, 1);
});

test("test tables all async", function() {
	var store = new BetaJS.Stores.MemoryStore();
	var Model = BetaJS.Modelling.Model.extend("Model", {});
	var table = new BetaJS.Modelling.Table(store, Model, {});
	var model = table.newModel();
	model.save();
	table.all().success(function (result) {
		var models = result.asArray();
		QUnit.equal(models.length, 1);
		QUnit.equal(models[0].id(), model.id());
	});
});

test("test tables findBy", function() {
	var store = new BetaJS.Stores.MemoryStore();
	var Model = BetaJS.Modelling.Model.extend("Model", {});
	var table = new BetaJS.Modelling.Table(store, Model, {});
	var model = table.newModel();
	model.save();
	var model2 = table.findBy({}).value();
	QUnit.equal(model2.id(), model.id());
});
