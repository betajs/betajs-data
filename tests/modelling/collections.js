test("test collection", function() {
	var Model = BetaJS.Data.Modelling.Model.extend("Model", {}, {
		_initializeScheme: function () {
			var scheme = this._inherited(Model, "_initializeScheme");
			scheme.test = {
				type: "string",
				index: true
			};
			return scheme;
		}
	});
	var table = new BetaJS.Data.Modelling.Table(new BetaJS.Data.Stores.MemoryStore(), Model, {});
	var coll = new BetaJS.Data.Collections.ActiveQueryCollection(table, {query: {test: "abc"}});
	var adder = 0;
	var remover = 0;
	coll.on("add", function () {
		adder++;
	});
	coll.on("remove", function () {
		remover++;
	});
	QUnit.equal(adder, 0);
	var model1 = table.newModel({test: "abc"});
	model1.save();
	QUnit.equal(adder, 1);
	var model2 = table.newModel({test: "def"});
	model2.save();
	QUnit.equal(adder, 1);
	model2.update({test: "abc"});
	QUnit.equal(adder, 2);
	QUnit.equal(remover, 0);
	model1.update({test: "def"});
	QUnit.equal(adder, 2);
	QUnit.equal(remover, 1);
	model2.remove();
	QUnit.equal(adder, 2);
	QUnit.equal(remover, 2);
	model1.remove();
	QUnit.equal(adder, 2);
	QUnit.equal(remover, 2);	
});
