Scoped.define("module:Modelling.Associations.Association", [
    "base:Class"
], function(Class, scoped) {
    return Class.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(model, options) {
                inherited.constructor.call(this);
                this._model = model;
                this._options = options || {};
            }

        };
    });
});