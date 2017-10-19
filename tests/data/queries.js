QUnit.test("simple conditional queries", function (assert) {
	assert.equal(BetaJS.Data.Queries.evaluate({key: {"$eq": 10}}, {key: 10}), true);
	assert.equal(BetaJS.Data.Queries.evaluate({key: {"$eq": 10}}, {key: 20}), false);
	assert.equal(BetaJS.Data.Queries.evaluate({key: {"$lt": 11}}, {key: 10}), true);
	assert.equal(BetaJS.Data.Queries.evaluate({key: {"$lt": 20}}, {key: 20}), false);
});

QUnit.test("disjunctive normal form", function (assert) {
	assert.deepEqual(BetaJS.Data.Queries.disjunctiveNormalForm({key: 1234}, true), {"$or": [{key: 1234}]});
});

QUnit.test("disjunctive normal form default", function (assert) {
	assert.deepEqual(BetaJS.Data.Queries.simplifiedDNF({}, true), {"$or": [{}]});
});

QUnit.test("disjunctive normal form 2", function (assert) {
	assert.deepEqual(BetaJS.Data.Queries.simplifiedDNF({foobar: 42}, true), {"$or": [{foobar: 42}]});
});



QUnit.test("elem match query", function (assert) {
    assert.equal(BetaJS.Data.Queries.evaluate({key: {"$elemMatch": {"$eq": 10}}}, {key: [5, 10, 20]}), true);
    assert.equal(BetaJS.Data.Queries.evaluate({key: {"$elemMatch": {"$eq": 11}}}, {key: [5, 10, 20]}), false);
});


QUnit.test("query diff le", function (assert) {
	var sub = {
		"date": {
			"$le": 1000
		},
		"foo": "bar"
	};
	var supr = {
		"foo": "bar",
		"date": {
			"$lt": 10000
		}
	};
	var diff = {
		"foo": "bar",
		"date": {
			"$lt": 10000,
			"$gt": 1000
		}
	};
	assert.deepEqual(BetaJS.Data.Queries.rangeSuperQueryDiffQuery(supr, sub), diff);
});

QUnit.test("query diff gte", function (assert) {
    var sub = {
        "date": {
            "$gte": 10000
        },
        "foo": "bar"
    };
    var supr = {
        "foo": "bar",
        "date": {
            "$gt": 1000
        }
    };
    var diff = {
        "foo": "bar",
        "date": {
            "$lt": 10000,
            "$gt": 1000
        }
    };
    assert.deepEqual(BetaJS.Data.Queries.rangeSuperQueryDiffQuery(supr, sub), diff);
});

QUnit.test("query diff both", function (assert) {
    var sub = {
        "date": {
            "$gte": 10000,
			"$lt": 20000
        },
        "foo": "bar"
    };
    var supr = {
        "foo": "bar",
        "date": {
            "$gte": 1000,
            "$lt": 21000
        }
    };
    var diff = {
        "foo": "bar",
		"$or": [{
            "date": {
                "$lt": 10000,
                "$gte": 1000
            }
        }, {
            "date": {
                "$lt": 21000,
                "$gte": 20000
            }
        }]
    };
    assert.deepEqual(BetaJS.Data.Queries.rangeSuperQueryDiffQuery(supr, sub), diff);
});