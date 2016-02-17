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
	var model0 = table.newModel({test: "abc"});
	model0.save();
	var coll = new BetaJS.Data.Collections.TableQueryCollection(table, {test: "abc"}, {
		active: true,
		auto: true
	});
	QUnit.equal(coll.getByIndex(0).get("test"), "abc");
	QUnit.equal(coll.count(), 1);
	model0.remove();
	QUnit.equal(coll.count(), 0);
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


test("test query collection", function() {
	var store = new BetaJS.Data.Stores.MemoryStore();
	for (var i = 1; i < 3; ++i)
		for (var j = 1; j < 3; ++j)
			for (var k = 1; k < 3; ++k)
				store.insert({i:i,j:j,k:k});
	var coll = new BetaJS.Data.Collections.StoreQueryCollection(store, {query: {i:1, j:1}, options: {sort: {k: -1}}}, {
		active: true,
		auto: true
	});
	coll.iterate(function (item) {
		item.set("marker", true);
	});
	QUnit.equal(coll.count(), 2);
	QUnit.equal(coll.getByIndex(0).get("k"), 2);
	coll.update({query: {i:1, k:1}});
	QUnit.equal(coll.count(), 2);
	var marker_count = 0;
	coll.iterate(function (item) {
		if (item.get("marker"))
			marker_count++;
	});
	QUnit.equal(marker_count, 1);
});


test("test query collection pagination", function() {
	var store = new BetaJS.Data.Stores.MemoryStore();
	for (var i = 0; i <= 4; ++i)
		for (var j = 0; j <= 9; ++j)
			store.insert({i:i,j:j});
	var coll = new BetaJS.Data.Collections.StoreQueryCollection(store, {}, {
		range: 10,
		auto: true,
		sort: {
			i: -1,
			j: 1
		}
	});
	var it = function () {
		return BetaJS.Objs.map(coll.iterator().asArray(), function (prop) {
			return prop.get("i") + "-" + prop.get("j");
		}).join(",");
	};
	QUnit.equal(coll.paginate_index(), 0);
	QUnit.equal(coll.getLimit(), 10);
	QUnit.equal(coll.getSkip(), 0);
	QUnit.deepEqual(it(), "4-0,4-1,4-2,4-3,4-4,4-5,4-6,4-7,4-8,4-9");
	coll.paginate_next();
	QUnit.equal(coll.paginate_index(), 1);
	QUnit.equal(coll.getLimit(), 10);
	QUnit.equal(coll.getSkip(), 10);
	QUnit.deepEqual(it(), "3-0,3-1,3-2,3-3,3-4,3-5,3-6,3-7,3-8,3-9");
	coll.paginate_next();
	QUnit.equal(coll.paginate_index(), 2);
	QUnit.equal(coll.getLimit(), 10);
	QUnit.equal(coll.getSkip(), 20);
	QUnit.deepEqual(it(), "2-0,2-1,2-2,2-3,2-4,2-5,2-6,2-7,2-8,2-9");
	coll.paginate_prev();
	QUnit.equal(coll.paginate_index(), 1);
	QUnit.equal(coll.getLimit(), 10);
	QUnit.equal(coll.getSkip(), 10);
	QUnit.deepEqual(it(), "3-0,3-1,3-2,3-3,3-4,3-5,3-6,3-7,3-8,3-9");
});


test("test query collection increasing", function() {
	var store = new BetaJS.Data.Stores.MemoryStore();
	for (var i = 0; i <= 4; ++i)
		for (var j = 0; j <= 9; ++j)
			store.insert({i:i,j:j});
	var coll = new BetaJS.Data.Collections.StoreQueryCollection(store, {}, {
		limit: 10,
		forward_steps: 10,
		auto: true,
		sort: {
			i: -1,
			j: 1
		}
	});
	var it = function () {
		return BetaJS.Objs.map(coll.iterator().asArray(), function (prop) {
			return prop.get("i") + "-" + prop.get("j");
		}).join(",");
	};
	QUnit.equal(coll.getLimit(), 10);
	QUnit.equal(coll.getSkip(), 0);
	QUnit.deepEqual(it(), "4-0,4-1,4-2,4-3,4-4,4-5,4-6,4-7,4-8,4-9");
	coll.increase_forwards();
	QUnit.deepEqual(it(), "4-0,4-1,4-2,4-3,4-4,4-5,4-6,4-7,4-8,4-9,3-0,3-1,3-2,3-3,3-4,3-5,3-6,3-7,3-8,3-9");
});






test("test query collection increasing 2", function() {
	var store = new BetaJS.Data.Stores.MemoryStore();
	// store.indices.i = new BetaJS.Data.Stores.MemoryIndex(store, "i");
	var c = 10;
	for (var i = 0; i < c; ++i)
		for (var j = 0; j < c; ++j)
			store.insert({i:i,j:j});
	var coll = new BetaJS.Data.Collections.StoreQueryCollection(store, {}, {
		limit: c,
		forward_steps: c,
		auto: true,
		sort: {
			i: -1,
			j: 1
		}
	});
	
	for (i = 0; i < c; ++i)
		coll.increase_forwards();
	QUnit.equal(coll.count(), c * c);
});

