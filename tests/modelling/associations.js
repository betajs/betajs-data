QUnit.test("has many through array virtual", function (assert) {
    var Model2 = BetaJS.Data.Modelling.Model.extend("Model2", {}, {
        _initializeScheme: function () {
            var scheme = this._inherited(Model2, "_initializeScheme");
            scheme.value = {
                type: "string"
            };
            return scheme;
        }
    });
    var store2 = new BetaJS.Data.Stores.MemoryStore();
    store2.insert_all([{
        id: 1,
        value: "a@a.a"
    }, {
        id: 2,
        value: "b@B.b"
    }, {
        id: 3,
        value: "c@C.c"
    }]);
    var table2 = new BetaJS.Data.Modelling.Table(store2, Model2, {});
    var Model1 = BetaJS.Data.Modelling.Model.extend("Model1", {
        _initializeAssociations: function () {
            var assocs = this._inherited(Model1, "_initializeAssociations");
            assocs.items = new BetaJS.Data.Modelling.Associations.HasManyThroughArrayAssociation(
                this,
                table2,
                "items", {
                    collectionOptions: {
                        auto: true
                    },
                    ignore_case: true,
                    foreign_attr: "value",
                    create_virtual: function (key) {
                        return table2.newModel({
                            value: key
                        });
                    },
                    map: function (s) {
                        return BetaJS.Strings.email_get_email(s);
                    }
                }
            );
            return assocs;
        }
    }, {
        _initializeScheme: function () {
            var scheme = this._inherited(Model1, "_initializeScheme");
            scheme.items = {
                type: "array"
            };
            return scheme;
        }
    });
    var store1 = new BetaJS.Data.Stores.MemoryStore();
    var table1 = new BetaJS.Data.Modelling.Table(store1, Model1, {});
    var model = table1.newModel({
        items: ["A <a@a.a>", "C <c@c.c>", "D <d@d.d>"]
    });
    model.save();

    var collectionAssoc = model.assocs.items.collection;
    var collection = collectionAssoc.acquire();
    assert.equal(model.get("items").length, 3);
    assert.equal(collection.count(), 3);
    collectionAssoc.add(table2.findById(2).value());
    assert.equal(model.get("items").length, 4);
    assert.equal(collection.count(), 4);
    var unsavedModel = table2.newModel({
        value: "e@e.e"
    });
    collectionAssoc.add(unsavedModel);
    assert.equal(model.get("items").length, 5);
    assert.equal(collection.count(), 5);
});

