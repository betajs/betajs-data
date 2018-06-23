Scoped.define("module:Modelling.Associations.OneAssociation", [
    "module:Modelling.Associations.TableAssociation",
    "base:Classes.SharedObjectFactory",
    "module:Modelling.ActiveModel",
    "base:Objs"
], function(TableAssociation, SharedObjectFactory, ActiveModel, Objs, scoped) {
    return TableAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function() {
                inherited.constructor.apply(this, arguments);
                this.active = new SharedObjectFactory(this.newActiveModel, this);
            },

            _buildQuery: function(query) {},

            buildQuery: function(query) {
                return this._buildQuery(Objs.extend(query, this._options.query));
            },

            _queryChanged: function() {
                var active = this.active.value();
                if (active)
                    active.update(this.buildQuery());
            },

            findBy: function(query, ctx) {
                var result = this.buildQuery(query);
                return this._foreignTable().findBy(result, null, ctx);
            },

            newActiveModel: function(query) {
                var result = this.buildQuery(query);
                return new ActiveModel(this._foreignTable(), result, this._options.queryOpts, this._options.activeOpts);
            },

            unset: function() {
                return this._unset();
            },

            _unset: function() {},

            set: function(model) {
                return this._set(model);
            },

            _set: function(model) {}

        };
    });
});