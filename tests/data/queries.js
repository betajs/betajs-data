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

test("disjunctive normal form 2", function () {
	QUnit.deepEqual(BetaJS.Data.Queries.simplifiedDNF({foobar: 42}, true), {"$or": [{foobar: 42}]});
});



test("elem match query", function () {
    QUnit.equal(BetaJS.Data.Queries.evaluate({key: {"$elemMatch": {"$eq": 10}}}, {key: [5, 10, 20]}), true);
    QUnit.equal(BetaJS.Data.Queries.evaluate({key: {"$elemMatch": {"$eq": 11}}}, {key: [5, 10, 20]}), false);
});
