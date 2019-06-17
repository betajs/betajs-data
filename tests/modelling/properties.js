QUnit.test("test emptiness check", function (assert) {
    var Model = BetaJS.Data.Modelling.AssociatedProperties.extend(null, {}, {
        _initializeScheme: function () {
            return BetaJS.Objs.extend({
                staticDefault: {
                    type: "int",
                    def: 42
                },
                staticDefaultIgnore: {
                    type: "int",
                    def: 42,
                    ignore_for_emptiness: true
                },
                dynamicDefaultIgnore: {
                    type: "float",
                    def: function () {
                        return Math.random();
                    },
                    ignore_for_emptiness: true
                }
            }, this._inherited(Model, "_initializeScheme"));
        }
    });
    var model = new Model();
    assert.equal(model.isEmpty(), true);
    model.set("staticDefaultIgnore", 43);
    assert.equal(model.isEmpty(), true);
    model.set("staticDefault", 41);
    assert.equal(model.isEmpty(), false);
    model.set("staticDefault", 42);
    assert.equal(model.isEmpty(), true);
});
