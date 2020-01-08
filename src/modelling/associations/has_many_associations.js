Scoped.define("module:Modelling.Associations.HasManyAssociation", [
    "module:Modelling.Associations.TableAssociation",
    "base:Classes.SharedObjectFactory",
    "base:Classes.SharedObjectFactoryPool",
    "module:Collections.TableQueryCollection",
    "base:Objs",
    "base:Functions",
    "base:Promise"
], function(TableAssociation, SharedObjectFactory, SharedObjectFactoryPool, TableQueryCollection, Objs, Functions, Promise, scoped) {
    return TableAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function() {
                inherited.constructor.apply(this, arguments);
                this.collection = this.newPooledCollection();
                this.collectionPool = new SharedObjectFactoryPool(this.newPooledCollection, this);
                if (this._model && this._model.isNew && !this._model.destroyed()) {
                    if (this._model.isNew())
                        this._model.once("save", this._queryChanged, this);
                    if (this._options.delete_cascade) {
                        this._model.registerHook("remove", function(result) {
                            return this.removeAll().mapSuccess(function() {
                                return result;
                            });
                        }, this);
                    }
                }
            },

            destroy: function() {
                this.collectionPool.destroy();
                this.collection.destroy();
                if (this._model)
                    this._model.off(null, null, this);
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
                }, this, {
                    norecursion: true
                });
                this._queryCollectionUpdated(coll);
                return coll;
            },

            remove: function(item) {
                var promise = item && !item.destroyed() && this._options.delete_cascade ? item.weaklyRemove() : Promise.value(true);
                return promise.mapSuccess(function() {
                    return this._remove(item);
                }, this);
            },

            removeAll: function() {
                return this.allBy().mapSuccess(function(iter) {
                    var promises = [];
                    while (iter.hasNext())
                        promises.push(this.remove(iter.next()));
                    return Promise.and(promises);
                }, this);
            },

            _remove: function(item) {},

            add: function(item) {
                if (this.collection.isAcquired())
                    this.collection.value().add(item);
                return this._add(item);
            },

            _add: function(item) {}

        };
    });
});