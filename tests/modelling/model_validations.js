QUnit.test("test model validation", function (assert) {
	var store = new BetaJS.Data.Stores.MemoryStore();
	var Model = BetaJS.Data.Modelling.Model.extend("Model", {}, {
		_initializeScheme: function () {
			return BetaJS.Objs.extend({
				present: {
					validate: new BetaJS.Data.Modelling.Validators.PresentValidator()
				}
			}, this._inherited(Model, "_initializeScheme"));
		}		
	});
	var table = new BetaJS.Data.Modelling.Table(store, Model, {});	
	var model = table.newModel();
	model.save();
	assert.ok(table.findById(model.id()).value() === null);
	model.set("present", "foobar");
	model.save();
	assert.ok(table.findById(model.id()).value() !== null);
});
