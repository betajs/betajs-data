test("test belongs to all", function() {
	var Model2 = BetaJS.Data.Modelling.Model.extend("Model2", {});
	var table2 = new BetaJS.Data.Modelling.Table(new BetaJS.Data.Stores.MemoryStore(), Model2, {});
	var Model1 = BetaJS.Data.Modelling.Model.extend("Model1", {
		_initializeAssociations: function () {
			var assocs = this._inherited(Model1, "_initializeAssociations");
			assocs["model2"] = new BetaJS.Data.Modelling.Associations.BelongsToAssociation(
				this,
				table2,
				"model2id",
				{
					cached: true
				}
			);
			return assocs;
		},		
	}, {
		_initializeScheme: function () {
			var scheme = this._inherited(Model1, "_initializeScheme");
			scheme["model2id"] = {
				type: "id",
				index: true
			};
			return scheme;
		}
	});
	var table1 = new BetaJS.Data.Modelling.Table(new BetaJS.Data.Stores.MemoryStore(), Model1, {});
	var model1 = table1.newModel();
	model1.save();
	model1.model2().success(function (m) {
		QUnit.equal(m, null);
	});
	var model2 = table2.newModel();
	model2.save();
	model1.update({
		model2id: model2.id()
	});
	model1.assocs.model2.invalidate();
	model1.model2().success(function (m) {
		QUnit.equal(m.id(), model2.id());
	});	
});
