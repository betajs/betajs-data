Scoped.define("module:Modelling.Associations.HasManyAssociation", [
    "module:Modelling.Associations.TableAssociation",
    "base:Classes.SharedObjectFactory",
    "module:Collections.TableQueryCollection",
    "base:Objs"
], function(TableAssociation, SharedObjectFactory, TableQueryCollection, Objs, scoped) {
    return TableAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function() {
                inherited.constructor.apply(this, arguments);
                this.collection = new SharedObjectFactory(this.newCollection, this);
            },

            _buildQuery: function(query, options) {},

            buildQuery: function(query, options) {
                return this._buildQuery(Objs.extend(query, this._options.query), Objs.extend(options, this._options.queryOptions));
            },

            _queryChanged: function() {
                var collection = this.collection.value();
                if (collection)
                    collection.update(this.buildQuery());
            },

            allBy: function(query, options) {
                var result = this.buildQuery(query, options);
                return this._foreign_table.allBy(result.query, result.options);
            },

            newCollection: function(query, options) {
                var result = this.buildQuery(query, options);
                return new TableQueryCollection(this._foreign_table, result.query, Objs.extend(result.options, this._options.collectionOptions));
            }

        };
    });
});