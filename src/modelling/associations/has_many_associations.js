Scoped.define("module:Modelling.Associations.HasManyAssociation", [
    "module:Modelling.Associations.TableAssociation",
    "base:Classes.SharedObjectFactory",
    "base:Classes.SharedObjectFactoryPool",
    "module:Collections.TableQueryCollection",
    "base:Objs",
    "base:Functions"
], function(TableAssociation, SharedObjectFactory, SharedObjectFactoryPool, TableQueryCollection, Objs, Functions, scoped) {
    return TableAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function() {
                inherited.constructor.apply(this, arguments);
                this.collection = this.newPooledCollection();
                this.collectionPool = new SharedObjectFactoryPool(this.newPooledCollection, this);
            },

            destroy: function() {
                this.collectionPool.destroy();
                this.collection.destroy();
                inherited.destroy.call(this);
            },

            customCollection: function() {
                return this.collectionPool.acquire.apply(this.collectionPool, arguments);
            },

            newPooledCollection: function() {
                var collection = new SharedObjectFactory(this.newCollection, this, Functions.getArguments(arguments));
                collection.add = Functions.as_method(this.add, this);
                collection.remove = Functions.as_method(this.remove, this);
                return collection;
            },

            _buildQuery: function(query, options) {},

            buildQuery: function(query, options) {
                return this._buildQuery(Objs.extend(query, this._options.query), Objs.extend(options, this._options.queryOpts));
            },

            _queryChanged: function() {
                var collection = this.collection.value();
                if (collection)
                    collection.update(this.buildQuery());
            },

            allBy: function(query, options) {
                var result = this.buildQuery(query, options);
                return this._foreignTable().allBy(result.query, result.options);
            },

            _queryCollectionUpdated: function(coll) {},

            newCollection: function(query, options) {
                var result = this.buildQuery(query, options);
                var coll = new TableQueryCollection(this._foreignTable(), result.query, Objs.extend(Objs.extend(result.options, this._options.collectionOptions), options));
                coll.on("replaced-objects collection-updated", function() {
                    this._queryCollectionUpdated(coll);
                }, this);
                this._queryCollectionUpdated(coll);
                return coll;
            },

            remove: function(item) {
                return this._remove(item);
            },

            _remove: function(item) {},

            add: function(item) {
                return this._add(item);
            },

            _add: function(item) {}

        };
    });
});