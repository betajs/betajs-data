test("simple conditional queries", function () {
	QUnit.equal(BetaJS.Data.Queries.evaluate({key: {"$eq": 10}}, {key: 10}), true);
	QUnit.equal(BetaJS.Data.Queries.evaluate({key: {"$eq": 10}}, {key: 20}), false);
	QUnit.equal(BetaJS.Data.Queries.evaluate({key: {"$lt": 11}}, {key: 10}), true);
	QUnit.equal(BetaJS.Data.Queries.evaluate({key: {"$lt": 20}}, {key: 20}), false);
});

test("disjunctive normal form", function () {
	QUnit.deepEqual(BetaJS.Data.Queries.disjunctiveNormalForm({key: 1234}, true), {"$or": [{key: 1234}]});
});

test("disjunctive normal form default", function () {
	QUnit.deepEqual(BetaJS.Data.Queries.simplifiedDNF({}, true), {"$or": [{}]});
});

