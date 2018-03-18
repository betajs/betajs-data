QUnit.test("keymap store preserves foreign ids", function (assert) {
    var baseStore = new BetaJS.Data.Stores.MemoryStore();
    var oldInsert = baseStore.insert;
    baseStore.insert = function () {
        return oldInsert.apply(this, arguments).mapSuccess(function (data) {
            var result = BetaJS.Objs.clone(data, 1);
            assert.equal(result.name_of_outer_id_in_inner_store, "my-outer-id");
            delete result.name_of_outer_id_in_inner_store;
            return result;
        });
    };
    var keyMapStore = new BetaJS.Data.Stores.KeyMapStore(baseStore, {
        id_key: "name_of_inner_id_in_outer_store",
        preserves: ["id"]
    }, {
        "name_of_inner_id_in_outer_store": "id",
        "id": "name_of_outer_id_in_inner_store"
    });

    keyMapStore.insert({
        "id": "my-outer-id",
        "other": "value"
    }).success(function (result) {
        assert.equal(result.other, "value");
        assert.equal(result.id, "my-outer-id");
        assert.ok(!!result.name_of_inner_id_in_outer_store);
        assert.ok(result.id != result.name_of_inner_id_in_outer_store);
    });
});


QUnit.test("keymap store does not preserve foreign ids", function (assert) {
    var baseStore = new BetaJS.Data.Stores.MemoryStore();
    var oldInsert = baseStore.insert;
    baseStore.insert = function () {
        return oldInsert.apply(this, arguments).mapSuccess(function (data) {
            var result = BetaJS.Objs.clone(data, 1);
            assert.equal(result.name_of_outer_id_in_inner_store, "my-outer-id");
            delete result.name_of_outer_id_in_inner_store;
            return result;
        });
    };
    var keyMapStore = new BetaJS.Data.Stores.KeyMapStore(baseStore, {
        id_key: "name_of_inner_id_in_outer_store"
    }, {
        "name_of_inner_id_in_outer_store": "id",
        "id": "name_of_outer_id_in_inner_store"
    });

    keyMapStore.insert({
        "id": "my-outer-id",
        "other": "value"
    }).success(function (result) {
        assert.equal(result.other, "value");
        assert.equal(result.id, undefined);
        assert.ok(!!result.name_of_inner_id_in_outer_store);
        assert.ok(result.id != result.name_of_inner_id_in_outer_store);
    });
});