/*!
betajs-data - v1.0.183 - 2021-03-06
Copyright (c) Oliver Friedmann,Pablo Iglesias
Apache-2.0 Software License.
*/

(function () {
var Scoped = this.subScope();
Scoped.binding('module', 'global:BetaJS.Data');
Scoped.binding('base', 'global:BetaJS');
Scoped.define("module:", function () {
	return {
    "guid": "70ed7146-bb6d-4da4-97dc-5a8e2d23a23f",
    "version": "1.0.183",
    "datetime": 1615065464679
};
});
Scoped.assumeVersion('base:version', '~1.0.141');
/**
 * @class AbstractQueryCollection
 *
 * A base class for querying collections. Subclasses specify the expected type
 * of data store and specify whether the query collection is active.
 */
Scoped.define("module:Collections.AbstractQueryCollection", [
    "base:Collections.Collection",
    "base:Objs",
    "base:Types",
    "base:Comparators",
    "base:Promise",
    "base:Class",
    "module:Queries.Constrained",
    "module:Queries",
    "module:Queries.ConstrainedQueryBuilder"
], function(Collection, Objs, Types, Comparators, Promise, Class, Constrained, Queries, ConstrainedQueryBuilder, scoped) {
    return Collection.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            /**
             * @method constructor
             *
             * @param {object} source The source object
             * can either be an instance of a Table
             * or a Store. A Table should be used if validations and other data
             * processing methods are desired. A Store is sufficient if just
             * performing simple queries and returning the results with little
             * manipulation.
             *
             * @param {object} query The query object contains keys specifying query
             * parameters and values specifying their respective values. This query
             * object can be updated later with the `set_query` method.
             *
             * @param {object} options The options object contains keys specifying
             * option parameters and values specifying their respective values.
             *
             * @return {QueryCollection} A new instance of QueryCollection.
             */
            constructor: function(source, query, options) {
                options = options || {};
                inherited.constructor.call(this, {
                    release_references: true,
                    uniqueness: options.uniqueness,
                    progressiveUniqueness: options.progressiveUniqueness,
                    indices: options.indices
                });
                if (ConstrainedQueryBuilder.is_instance_of(query)) {
                    this._rangeQueryBuilder = options.range_query_builder;
                    this.__queryBuilder = query;
                    query = this.__queryBuilder.getQuery();
                    if (this._rangeQueryBuilder)
                        query = Objs.extend(query, this._rangeQueryBuilder.getQuery());
                    options = Objs.extend(options, this.__queryBuilder.getOptions());
                    this.__queryBuilder.on("change", function() {
                        var cQ = this.__queryBuilder.getConstrainedQuery();
                        if (this._rangeQueryBuilder)
                            cQ.query = Objs.extend(this._rangeQueryBuilder.getQuery(), cQ.query);
                        this.update(cQ);
                    }, this);
                    if (this._rangeQueryBuilder) {
                        this._rangeQueryBuilder.on("change", function() {
                            var cQ = this.__queryBuilder.getConstrainedQuery();
                            this.rangeSuperQueryIncrease(Objs.extend(this._rangeQueryBuilder.getQuery(), cQ.query));
                        }, this);
                    }
                }
                this._id_key = this._id_key || options.id_key || "id";
                this._secondary_ident = options.secondary_ident;
                this._source = source;
                this._complete = false;
                this._active = options.active || false;
                this._incremental = "incremental" in options ? options.incremental : true;
                this._active_bounds = "active_bounds" in options ? options.active_bounds : true;
                this._bounds_attribute = options.bounds_attribute;
                this._enabled = false;
                this._range = options.range || null;
                this._forward_steps = options.forward_steps || null;
                this._backward_steps = options.backward_steps || null;
                this._async = options.async || false;
                this._active_in_direction = "active_in_direction" in options ? options.active_in_direction : false;
                if (this._active) {
                    this.on("add", function(object) {
                        this._watchItem(object.get(this._id_key));
                    }, this);
                    this.on("remove", function(object) {
                        this._unwatchItem(object.get(this._id_key));
                    }, this);
                }
                this._query = {
                    query: {},
                    options: {
                        skip: 0,
                        limit: null,
                        sort: null
                    }
                };
                this.update(Objs.tree_extend({
                    query: {},
                    options: {
                        skip: options.skip || 0,
                        limit: options.limit || options.range || null,
                        sort: options.sort || null
                    }
                }, query ? (query.query || query.options ? query : {
                    query: query
                }) : {}));
                if (options.auto)
                    this.enable();
            },

            destroy: function() {
                this.disable();
                if (this._watcher()) {
                    this._watcher().unwatchInsert(null, this);
                    this._watcher().unwatchItem(null, this);
                }
                if (this.__queryBuilder)
                    this.__queryBuilder.off(null, null, this);
                inherited.destroy.call(this);
            },

            /**
             * @method source
             *
             * Returns the source (a store or a table)
             *
             * @return {object} Data source
             */

            source: function() {
                return this._source;
            },

            /**
             * @method paginate
             *
             * Paginate to a specific page.
             *
             * @param {int} index The page to paginate to.
             *
             * @return {Promise} Promise from query execution.
             */

            paginate: function(index) {
                return this.update({
                    options: {
                        skip: index * this._range,
                        limit: this._range
                    }
                });
            },

            /**
             * @method paginate_index
             *
             * @return {int} Current pagination page.
             */
            paginate_index: function() {
                return Math.floor(this.getSkip() / this._range);
            },

            /**
             * @method paginate_next
             *
             * Update the query to paginate to the next page.
             *
             * @return {Promise} Promise of the query.
             */
            paginate_next: function() {
                return this.isComplete() ? Promise.create(true) : this.paginate(this.paginate_index() + 1);
            },

            /**
             * @method paginate_prev
             *
             * Update the query to paginate to the previous page.
             *
             * @return {Promise} Promise of the query.
             */
            paginate_prev: function() {
                return this.paginate_index() > 0 ? this.paginate(this.paginate_index() - 1) : Promise.create(true);
            },

            increase_forwards: function(steps) {
                steps = steps || this._forward_steps;
                return this.isComplete() ? Promise.create(true) : this.update({
                    options: {
                        limit: this.getLimit() + steps
                    }
                });
            },

            increase_backwards: function(steps) {
                steps = steps || this._backward_steps;
                return !this.getSkip() ? Promise.create(true) : this.update({
                    options: {
                        skip: Math.max(this.getSkip() - steps, 0),
                        limit: this.getLimit() ? this.getLimit() + this.getSkip() - Math.max(this.getSkip() - steps, 0) : null
                    }
                });
            },

            bounds_forwards: function(newUpperBound) {
                var oldUpperBound = this._query.query[this._bounds_attribute].$lt;
                this._query.query[this._bounds_attribute].$lt = newUpperBound;
                var queryCopy = Objs.clone(this._query.query, 2);
                queryCopy[this._bounds_attribute].$gte = oldUpperBound;
                return this._execute({
                    query: queryCopy
                }, true);
            },

            bounds_backwards: function(newLowerBound) {
                var oldLowerBound = this._query.query[this._bounds_attribute].$gte;
                this._query.query[this._bounds_attribute].$gte = newLowerBound;
                var queryCopy = Objs.clone(this._query.query, 2);
                queryCopy[this._bounds_attribute].$lt = oldLowerBound;
                return this._execute({
                    query: queryCopy
                }, true);
            },

            get_ident: function(obj) {
                var result = Class.is_class_instance(obj) ? obj.get(this._id_key) : obj[this._id_key];
                if (!result && this._secondary_ident)
                    result = this._secondary_ident(obj);
                return result;
            },

            getQuery: function() {
                return this._query;
            },

            getSkip: function() {
                return this._query.options.skip || 0;
            },

            getLimit: function() {
                return this._query.options.limit || null;
            },

            /**
             * @method update
             *
             * Update the collection with a new query. Setting the query not only
             * updates the query field, but also updates the data with the results of
             * the new query.
             *
             * @param {object} constrainedQuery The new query for this collection.
             *
             * @example
             * // Updates the query dictating the collection contents.
             * collectionQuery.update({query: {'queryField': 'queryValue'}, options: {skip: 10}});
             */
            update: function(constrainedQuery) {
                this.trigger("collection-updating");
                return this.__update(constrainedQuery).callback(function() {
                    this.trigger("collection-updated");
                }, this);
            },

            __update: function(constrainedQuery) {
                var hasQuery = !!constrainedQuery.query;
                constrainedQuery = Constrained.rectify(constrainedQuery);
                var currentSkip = this._query.options.skip || 0;
                var currentLimit = this._query.options.limit || null;
                if (hasQuery)
                    this._query.query = constrainedQuery.query;
                this._query.options = Objs.extend(this._query.options, constrainedQuery.options);
                if (!this._enabled)
                    return Promise.create(true);
                if (hasQuery || "sort" in constrainedQuery.options || !this._incremental)
                    return this.refresh(true);
                var nextSkip = "skip" in constrainedQuery.options ? constrainedQuery.options.skip || 0 : currentSkip;
                var nextLimit = "limit" in constrainedQuery.options ? constrainedQuery.options.limit || null : currentLimit;
                if (nextSkip === currentSkip && nextLimit === currentLimit)
                    return Promise.create(true);
                // No overlap
                if ((nextLimit && nextSkip + nextLimit <= currentSkip) || (currentLimit && currentSkip + currentLimit <= nextSkip))
                    return this.refresh(true);
                // Make sure that currentSkip >= nextSkip
                while (currentSkip < nextSkip && (currentLimit === null || currentLimit > 0)) {
                    this.remove(this.getByIndex(0));
                    currentSkip++;
                    currentLimit--;
                }
                var promise = Promise.create(true);
                // Make sure that nextSkip === currentSkip
                if (nextSkip < currentSkip) {
                    var leftLimit = currentSkip - nextSkip;
                    if (nextLimit !== null)
                        leftLimit = Math.min(leftLimit, nextLimit);
                    promise = this._execute(Objs.tree_extend(Objs.clone(this._query, 2), {
                        options: {
                            skip: nextSkip,
                            limit: leftLimit
                        }
                    }, 2), true);
                    nextSkip += leftLimit;
                    if (nextLimit !== null)
                        nextLimit -= leftLimit;
                }
                if (!currentLimit || (nextLimit && nextLimit <= currentLimit)) {
                    if (nextLimit)
                        while (this.count() > nextLimit)
                            this.remove(this.getByIndex(this.count() - 1));
                    return promise;
                }
                return promise.and(this._execute(Objs.tree_extend(Objs.clone(this._query, 2), {
                    options: {
                        skip: currentSkip + currentLimit,
                        limit: !nextLimit ? null : nextLimit - currentLimit
                    }
                }, 2), true));
            },

            enable: function() {
                if (this._enabled)
                    return;
                this._enabled = true;
                this.refresh();
            },

            disable: function() {
                if (!this._enabled)
                    return;
                this._enabled = false;
                this.clear();
                this._unwatchInsert();
            },

            refresh: function(clear) {
                if (clear && !this._incremental)
                    this.clear();
                if (this._query.options.sort && !Types.is_empty(this._query.options.sort)) {
                    this.set_compare(Comparators.byObject(this._query.options.sort));
                } else {
                    this.set_compare(null);
                }
                this._unwatchInsert();
                if (this._active)
                    this._watchInsert(this._query);
                return this._execute(this._query, !(clear && this._incremental));
            },

            rangeSuperQueryIncrease: function(query) {
                var diffQuery = Queries.rangeSuperQueryDiffQuery(query, this._query.query);
                if (!diffQuery)
                    throw "Range Super Query expected";
                this._query.query = query;
                this._unwatchInsert();
                if (this._active)
                    this._watchInsert(this._query);
                return this._execute({
                    query: diffQuery,
                    options: this._query.options
                }, true);
            },

            isEnabled: function() {
                return this._enabled;
            },

            /**
             * @method _execute
             *
             * Execute a constrained query. This method is called whenever a new query is set.
             * Doesn't override previous reults.
             *
             * @protected
             *
             * @param {constrainedQuery} constrainedQuery The constrained query that should be executed
             *
             * @return {Promise} Promise from executing query.
             */
            _execute: function(constrainedQuery, keep_others) {
                if (this.__executePromise) {
                    return this.__executePromise.mapCallback(function() {
                        return this._execute(constrainedQuery, keep_others);
                    }, this);
                }
                return this._subExecute(constrainedQuery.query, constrainedQuery.options).mapSuccess(function(iter) {
                    if (!keep_others || !this._async) {
                        this.replace_objects(iter.asArray(), keep_others);
                        return true;
                    }
                    if (!iter.hasNext()) {
                        this._complete = true;
                        iter.destroy();
                        return true;
                    }
                    this.__executePromise = iter.asyncIterate(this.replace_object, this);
                    this.__executePromise.callback(function() {
                        this.__executePromise = null;
                    }, this);
                    return true;
                }, this);
            },

            /**
             * @method _sub_execute
             *
             * Run the specified query on the data source.
             *
             * @private
             *
             * @param {object} options The options for the subquery.
             *
             * @return {object} Iteratable object containing query results.
             */
            _subExecute: function(query, options) {
                return this._source.query(query, options);
            },

            /**
             * @method isComplete
             *
             * @return {boolean} Return value indicates if the query has finished/if
             * data has been returned.
             */
            isComplete: function() {
                return this._complete;
            },

            isValid: function(data) {
                return Queries.evaluate(this._query.query, data);
            },

            _materialize: function(data) {
                return data;
            },

            _activeCreate: function(data) {
                if (!this._active || !this._enabled)
                    return;
                if (!this.isValid(data))
                    return;
                if (this._active_in_direction && this._query.options.sort && this._query.options.limit && this.count() >= this._query.options.limit) {
                    var item = this.getByIndex(this.count() - 1).getAll();
                    var comp = Comparators.byObject(this._query.options.sort);
                    if (comp(item, data) < 0)
                        return;
                }
                this.add(this._materialize(data));
                if (this._query.options.limit && this.count() > this._query.options.limit) {
                    if (this._active_bounds)
                        this._query.options.limit++;
                    else
                        this.remove(this.getByIndex(this.count() - 1));
                }
            },

            _activeRemove: function(id) {
                if (!this._active || !this._enabled)
                    return;
                var object = this.getById(id);
                if (!object)
                    return;
                this.remove(object);
                if (this._query.options.limit !== null) {
                    if (this._active_bounds)
                        this._query.options.limit--;
                }
            },

            _activeUpdate: function(id, data, row) {
                if (!this._active || !this._enabled)
                    return;
                var object = this.getById(id);
                var merged = Objs.extend(row, data);
                if (!object)
                    this._activeCreate(merged);
                else if (!this.isValid(Objs.extend(Objs.clone(object.getAll(), 1), merged)))
                    this._activeRemove(id);
                else if (object.setAllNoChange)
                    object.setAllNoChange(data);
                else
                    object.setAll(data);
            },

            _watcher: function() {
                return null;
            },

            _watchInsert: function(query) {
                if (this._watcher())
                    this._watcher().watchInsert(query, this);
            },

            _unwatchInsert: function() {
                if (this._watcher())
                    this._watcher().unwatchInsert(null, this);
            },

            _watchItem: function(id) {
                if (this._watcher())
                    this._watcher().watchItem(id, this);
            },

            _unwatchItem: function(id) {
                if (this._watcher())
                    this._watcher().unwatchItem(id, this);
            }

        };
    });
});
Scoped.define("module:Collections.StoreQueryCollection", [
    "module:Collections.AbstractQueryCollection",
    "base:Objs"
], function(QueryCollection, Objs, scoped) {
    return QueryCollection.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(source, query, options) {
                inherited.constructor.call(this, source, query, Objs.extend({
                    id_key: source.id_key()
                }, options));
                this._source = source;
                source.on("insert", this._activeCreate, this);
                source.on("remove", this._activeRemove, this);
                source.on("update", function(row, data) {
                    this._activeUpdate(source.id_of(row), data, row);
                }, this);
            },

            destroy: function() {
                this._source.off(null, null, this);
                inherited.destroy.call(this);
            },

            get_ident: function(obj) {
                return obj.get(this._source.id_key());
            },

            _watcher: function() {
                return this._source.watcher();
            }

        };
    });
});
Scoped.define("module:Collections.TableQueryCollection", [
    "module:Collections.AbstractQueryCollection",
    "base:Objs"
], function(QueryCollection, Objs, scoped) {
    return QueryCollection.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(source, query, options) {
                inherited.constructor.call(this, source, query, Objs.extend({
                    id_key: source.primary_key()
                }, options));
                source.on("create", this._activeCreate, this);
                source.on("remove", this._activeRemove, this);
                source.on("update", this._activeUpdate, this);
            },

            destroy: function() {
                this._source.off(null, null, this);
                inherited.destroy.call(this);
            },

            _materialize: function(data) {
                return this._source.materialize(data);
            },

            _watcher: function() {
                return this._source.store().watcher();
            }

        };
    });
});
Scoped.define("module:Databases.AggregatedKeysDatabaseTableWrapper", [
    "module:Databases.DatabaseTable",
    "base:Objs",
    "base:Types"
], function(Class, Objs, Types, scoped) {
    return Class.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(database, table_name, table_options) {
                inherited.constructor.call(this, database, table_name, table_options);
                table_options = table_options || {};
                this._aggregation = {
                    aggregates: {},
                    attributes_aggregates_dependencies: {},
                    attributes_attributes_dependencies: {}
                };
                Objs.iter(table_options.aggregates, function(aggregate) {
                    var aggregateName = aggregate.join("_");
                    this._aggregation.aggregates[aggregateName] = aggregate;
                    aggregate.forEach(function(attr) {
                        this._aggregation.attributes_aggregates_dependencies[attr] = this._aggregation.attributes_aggregates_dependencies[attr] || [];
                        this._aggregation.attributes_aggregates_dependencies[attr].push(aggregateName);
                        this._aggregation.attributes_attributes_dependencies[attr] = this._aggregation.attributes_attributes_dependencies[attr] || {};
                        Objs.extend(this._aggregation.attributes_attributes_dependencies[attr], Objs.objectify(aggregate));
                    }, this);
                }, this);
                this._aggregation.attributes_attributes_dependencies = Objs.map(this._aggregation.attributes_attributes_dependencies, function(value) {
                    return Objs.keys(value);
                });
                delete table_options.aggregates;
                this.__databaseTable = database.database().getTable(table_name, table_options);
            },

            databaseTable: function() {
                return this.__databaseTable;
            },

            deleteTable: function() {
                return this.databaseTable().deleteTable();
            },

            createTable: function() {
                return this.databaseTable().createTable();
            },

            _aggregatesOf: function(row) {
                var result = {};
                Objs.iter(this._aggregation.aggregates, function(aggregate, aggregateName) {
                    var valid = true;
                    var mapped = aggregate.map(function(key) {
                        if (!(key in row))
                            valid = false;
                        return row[key];
                    });
                    if (valid) {
                        var keys = [];
                        var values = [];
                        mapped.forEach(function(entry) {
                            if (Types.is_object(entry)) {
                                keys.push(Objs.ithKey(entry));
                                values.push(Objs.ithValue(entry));
                            } else
                                values.push(entry);
                        });
                        result[aggregateName] = keys.length > 0 ? Objs.objectBy(keys[0], values.join("_")) : values.join("_");
                    }
                }, this);
                return result;
            },

            _missingAggregateDependencies: function(row) {
                var result = {};
                Objs.iter(this._aggregation.aggregates, function(aggregate) {
                    var depends = false;
                    var missing = [];
                    aggregate.forEach(function(key) {
                        if (key in row)
                            depends = true;
                        else
                            missing.push(key);
                    });
                    if (depends && missing.length > 0) {
                        missing.forEach(function(key) {
                            result[key] = true;
                        });
                    }
                }, this);
                return result;
            },

            _insertRow: function(row) {
                return this.databaseTable().insertRow(Objs.extend(this._aggregatesOf(row), row));
            },

            _removeRow: function(row) {
                return this.databaseTable().removeRow(Objs.extend(this._aggregatesOf(row), row));
            },

            _updateRow: function(query, row) {
                query = query || {};
                var missingDeps = this._missingAggregateDependencies(row);
                for (var key in missingDeps) {
                    if (key in query) {
                        row[key] = query[key];
                        delete missingDeps[key];
                    }
                }
                if (Types.is_empty(missingDeps))
                    return this.databaseTable().updateRow(Objs.extend(this._aggregatesOf(query), query), row);
                return this.findOne(Objs.extend(this._aggregatesOf(query), query)).mapSuccess(function(data) {
                    data = Objs.extend(data, query);
                    return this.databaseTable().updateRow(Objs.extend(this._aggregatesOf(data), data), row);
                }, this);
            },

            _find: function(query, options) {
                return this.databaseTable().find(Objs.extend(this._aggregatesOf(query), query), options);
            }

        };
    });
});

Scoped.define("module:Databases.AggregatedKeysDatabaseWrapper", [
    "module:Databases.Database",
    "module:Databases.AggregatedKeysDatabaseTableWrapper"
], function(Class, AggregatedKeysDatabaseTableWrapper, scoped) {
    return Class.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(database) {
                inherited.constructor.apply(this);
                this.__database = database;
            },

            database: function() {
                return this.__database;
            },

            _tableClass: function() {
                return AggregatedKeysDatabaseTableWrapper;
            }

        };

    });
});
Scoped.define("module:Stores.DatabaseStore", [
    "module:Stores.BaseStore",
    "base:Objs",
    "module:Queries",
    "module:Queries.Constrained",
    "base:Iterators.MappedIterator"
], function(BaseStore, Objs, Queries, ConstrainedQueries, MappedIterator, scoped) {
    return BaseStore.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(database, table_name, id_key, separate_ids, table_options) {
                this.__database = database;
                this.__table_name = table_name;
                this.__table = this.__database.getTable(this.__table_name, table_options);
                inherited.constructor.call(this, {
                    id_key: id_key || this.__table.primary_key(),
                    create_ids: separate_ids
                });
                this.__separate_ids = separate_ids;
                this.__map_ids = !this.__separate_ids && this.id_key() !== this.__table.primary_key();
            },

            table: function() {
                return this.__table;
            },

            _remove: function(id) {
                return this.__separate_ids ? this.table().removeRow(this.id_row(id)) : this.table().removeById(id);
            },

            _get: function(id) {
                var promise = this.__separate_ids ? this.table().findOne(this.id_row(id)) : this.table().findById(id);
                return this.__map_ids ? promise.mapSuccess(function(data) {
                    if (data) {
                        data[this.id_key()] = data[this.table().primary_key()];
                        delete data[this.table().primary_key()];
                    }
                    return data;
                }, this) : promise;
            },

            _update: function(id, data) {
                delete data[this.__table.primary_key()];
                return this.__separate_ids ?
                    this.table().updateRow(this.id_row(id), data) :
                    this.table().updateById(id, data);
            },

            _query_capabilities: function() {
                return ConstrainedQueries.fullConstrainedQueryCapabilities(Queries.fullQueryCapabilities());
            },

            _insert: function(data) {
                var promise = this.table().insertRow(data);
                return this.__map_ids ? promise.mapSuccess(function(data) {
                    data[this.id_key()] = data[this.table().primary_key()];
                    delete data[this.table().primary_key()];
                    return data;
                }, this) : promise;
            },

            _query: function(query, options) {
                if (this.__map_ids && query[this.id_key()]) {
                    query = Objs.clone(query, 1);
                    query[this.table().primary_key()] = query[this.id_key()];
                    delete query[this.id_key()];
                }
                var promise = this.table().find(query, options);
                return this.__map_ids ? promise.mapSuccess(function(results) {
                    return (new MappedIterator(results, function(data) {
                        data[this.id_key()] = data[this.table().primary_key()];
                        delete data[this.table().primary_key()];
                        return data;
                    }, this)).auto_destroy(results, true);
                }, this) : promise;
            },

            _ensure_index: function(key) {
                this.table().ensureIndex(key);
            },

            clear: function(ctx) {
                return ctx ? inherited.clear.call(ctx) : this.table().clear();
            }

        };
    });
});
Scoped.define("module:Databases.DatabaseTable", [
    "base:Class",
    "base:Objs",
    "base:Iterators.MappedIterator"
], function(Class, Objs, MappedIterator, scoped) {
    return Class.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(database, table_name, table_options) {
                inherited.constructor.call(this);
                this._database = database;
                this._table_name = table_name;
                this._table_options = table_options || {};
            },

            primary_key: function() {
                return "id";
            },

            findOne: function(query, options) {
                return this._findOne(this._encode(query), options).mapSuccess(function(result) {
                    return !result ? null : this._decode(result);
                }, this);
            },

            _findOne: function(query, options) {
                options = options || {};
                options.limit = 1;
                return this._find(query, options).mapSuccess(function(result) {
                    var item = result.next();
                    result.destroy();
                    return item;
                });
            },

            _encode: function(data) {
                return data;
            },

            _decode: function(data) {
                return data;
            },

            _decodeMany: function(data) {
                return data;
            },

            _find: function(query, options) {},

            find: function(query, options) {
                return this._find(this._encode(query), options).mapSuccess(function(result) {
                    return (new MappedIterator(result, this._decode, this)).auto_destroy(result, true);
                }, this);
            },

            findById: function(id) {
                return this.findOne(Objs.objectBy(this.primary_key(), id));
            },

            count: function(query) {
                return this._count(this._encode(query));
            },

            _insertRow: function(row) {},

            _insertRows: function(rows) {},

            _removeRow: function(query) {},

            _updateRow: function(query, row) {},

            _count: function(query) {
                return this.find(query).mapSuccess(function(iter) {
                    var count = 0;
                    while (iter.hasNext()) {
                        count++;
                        iter.next();
                    }
                    iter.destroy();
                    return count;
                });
            },

            insertRow: function(row) {
                return this._insertRow(this._encode(row)).mapSuccess(this._decode, this);
            },

            insertRows: function(rows) {
                var encodedRows = [];
                Objs.iter(rows, function(obj, ind) {
                    encodedRows.push(this._encode(obj));
                }, this);
                return this._insertRows(encodedRows).mapSuccess(this._decodeMany, this);
            },

            removeRow: function(query) {
                return this._removeRow(this._encode(query));
            },

            updateRow: function(query, row) {
                return this._updateRow(this._encode(query), this._encode(row)).mapSuccess(this._decode, this);
            },

            removeById: function(id) {
                return this.removeRow(Objs.objectBy(this.primary_key(), id));
            },

            updateById: function(id, data) {
                return this.updateRow(Objs.objectBy(this.primary_key(), id), data);
            },

            ensureIndex: function(key) {},

            _clear: function() {
                return this._removeRow({});
            },

            clear: function() {
                return this._clear();
            },

            renameTable: function(newName) {
                return this._renameTable(newName).success(function() {
                    this._database._renameTableCache(newName, this._table_name);
                    this._table_name = newName;
                }, this);
            },

            _renameTable: function(newName) {
                throw "Unsupported";
            },

            createTable: function() {
                return this._createTable(this._table_name);
            },

            _createTable: function(newName) {
                throw "Unsupported";
            },

            deleteTable: function() {
                return this._deleteTable(this._table_name);
            },

            _deleteTable: function(newName) {
                throw "Unsupported";
            },

            ensureTable: function() {
                var promise = Promise.create();
                this.createTable().callback(function() {
                    promise.asyncSuccess(true);
                });
                return promise;
            }

        };
    });
});
Scoped.define("module:Databases.Database", [
    "base:Class"
], function(Class, scoped) {
    return Class.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function() {
                inherited.constructor.apply(this);
                this.__tableCache = {};
            },

            _tableClass: function() {
                return null;
            },

            getTable: function(table_name, table_options) {
                if (!this.__tableCache[table_name]) {
                    var cls = this._tableClass();
                    this.__tableCache[table_name] = this.auto_destroy(new cls(this, table_name, table_options));
                }
                return this.__tableCache[table_name];
            },

            _renameTableCache: function(old_table_name, new_table_name) {
                this.__tableCache[new_table_name] = this.__tableCache[old_table_name];
                delete this.__tableCache[old_table_name];
            }

        };

    });
});
Scoped.define("module:Databases.Migrator", [
    "base:Class",
    "base:Types"
], function(Class, Types, scoped) {
    return Class.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function() {
                inherited.constructor.call(this);
                this.__version = null;
                this.__migrations = [];
                this.__sorted = true;
            },

            version: function(offset) {
                if (!this.__version)
                    this.__version = this._getVersion();
                return this.__version;
            },

            _getVersion: function() {},

            _setVersion: function(version) {},

            _log: function(s) {},

            migrations: function() {
                if (!this.__sorted) {
                    this.__migrations.sort(function(x, y) {
                        return x.version - y.version;
                    });
                    this.__sorted = true;
                }
                return this.__migrations;
            },

            register: function(migration) {
                this.__migrations.push(migration);
                this.__sorted = false;
            },

            _indexByVersion: function(version) {
                for (var i = 0; i < this.__migrations.length; ++i) {
                    if (version == this.__migrations[i].version)
                        return i;
                    else if (version < this.__migrations[i].version)
                        return i - 1;
                }
                return this.__migrations.length;
            },

            migrate: function(version) {
                var current = this._indexByVersion(this.version());
                var target = Types.is_defined(version) ? this._indexByVersion(version) : this.__migrations.length - 1;
                while (current < target) {
                    var migration = this.__migrations[current + 1];
                    this._log("Migrate " + migration.version + ": " + migration.title + " - " + migration.description + "...\n");
                    try {
                        migration.migrate();
                        this._setVersion(this.__migrations[current + 1].version);
                        current++;
                        this._log("Successfully migrated " + migration.version + ".\n");
                    } catch (e) {
                        this._log("Failure! Rolling back " + migration.version + "...\n");
                        try {
                            if ("partial_rollback" in migration)
                                migration.partial_rollback();
                            else if ("rollback" in migration)
                                migration.rollback();
                            else
                                throw "No rollback defined";
                        } catch (ex) {
                            this._log("Failure! Couldn't roll back " + migration.version + "!\n");
                            throw ex;
                        }
                        this._log("Rolled back " + migration.version + "!\n");
                        throw e;
                    }
                }
            },

            rollback: function(version) {
                var current = this._indexByVersion(this.version());
                var target = Types.is_defined(version) ? this._indexByVersion(version) : current - 1;
                while (current > target) {
                    var migration = this.__migrations[current];
                    this._log("Rollback " + migration.version + ": " + migration.title + " - " + migration.description + "...\n");
                    try {
                        migration.rollback();
                        this._setVersion(current >= 1 ? this.__migrations[current - 1].version : 0);
                        current--;
                        this._log("Successfully rolled back " + migration.version + ".\n");
                    } catch (e) {
                        this._log("Failure! Couldn't roll back " + migration.version + "!\n");
                        throw e;
                    }
                }
            }

        };
    });
});
Scoped.define("module:Stores.AbstractIndex", [
    "base:Class",
    "base:Comparators",
    "base:Objs",
    "base:Functions"
], function(Class, Comparators, Objs, Functions, scoped) {
    return Class.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(store, key, compare, options) {
                inherited.constructor.call(this);
                this._options = Objs.extend({
                    exact: true,
                    ignoreCase: false
                }, options);
                this._compare = compare || Comparators.byValue;
                this._store = store;
                this.__row_count = 0;
                this._initialize();
                var id_key = store.id_key();
                store.query({}).value().iterate(function(row) {
                    this.__row_count++;
                    this._insert(row[id_key], row[key]);
                }, this);
                store.on("insert", function(row) {
                    this.__row_count++;
                    this._insert(row[id_key], row[key]);
                }, this);
                store.on("remove", function(id) {
                    this.__row_count--;
                    this._remove(id);
                }, this);
                store.on("update", function(id, data) {
                    if (key in data)
                        this._update(id, data[key]);
                }, this);
            },

            _initialize: function() {},

            destroy: function() {
                this._store.off(null, null, this);
                inherited.destroy.call(this);
            },

            compare: function() {
                return this._compare.apply(arguments);
            },

            comparator: function() {
                return Functions.as_method(this, this._compare);
            },

            info: function() {
                return {
                    row_count: this.__row_count,
                    key_count: this._key_count(),
                    key_count_ic: this._key_count_ic()
                };
            },

            options: function() {
                return this._options;
            },

            iterate: function(key, direction, callback, context) {
                this._iterate(key, direction, callback, context);
            },

            itemIterate: function(key, direction, callback, context) {
                this.iterate(key, direction, function(iterKey, id) {
                    return callback.call(context, iterKey, this._store.get(id).value());
                }, this);
            },

            iterate_ic: function(key, direction, callback, context) {
                this._iterate_ic(key, direction, callback, context);
            },

            itemIterateIc: function(key, direction, callback, context) {
                this.iterate_ic(key, direction, function(iterKey, id) {
                    return callback.call(context, iterKey, this._store.get(id).value());
                }, this);
            },

            _iterate: function(key, direction, callback, context) {},

            _iterate_ic: function(key, direction, callback, context) {},

            _insert: function(id, key) {},

            _remove: function(id) {},

            _update: function(id, key) {},

            _key_count: function() {},

            _key_count_ic: function() {},

            key_count_left_ic: function(key) {},
            key_count_right_ic: function(key) {},
            key_count_distance_ic: function(leftKey, rightKey) {},
            key_count_left: function(key) {},
            key_count_right: function(key) {},
            key_count_distance: function(leftKey, rightKey) {}

        };
    });
});
Scoped.define("module:Stores.MemoryIndex", [
    "module:Stores.AbstractIndex",
    "base:Structures.TreeMap",
    "base:Objs",
    "base:Types"
], function(AbstractIndex, TreeMap, Objs, Types, scoped) {
    return AbstractIndex.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            _initialize: function() {
                if (this._options.exact)
                    this._exactMap = TreeMap.empty(this._compare);
                if (this._options.ignoreCase)
                    this._ignoreCaseMap = TreeMap.empty(this._compare);
                this._idToKey = {};
            },

            __insert: function(id, key, map) {
                var value = TreeMap.find(key, map);
                if (value)
                    value[id] = true;
                else
                    map = TreeMap.add(key, Objs.objectBy(id, true), map);
                return map;
            },

            _insert: function(id, key) {
                this._idToKey[id] = key;
                if (this._options.exact)
                    this._exactMap = this.__insert(id, key, this._exactMap);
                if (this._options.ignoreCase)
                    this._ignoreCaseMap = this.__insert(id, key, this._ignoreCaseMap);
            },

            __remove: function(key, map, id) {
                var value = TreeMap.find(key, map);
                delete value[id];
                if (Types.is_empty(value))
                    map = TreeMap.remove(key, map);
                return map;
            },

            _remove: function(id) {
                var key = this._idToKey[id];
                delete this._idToKey[id];
                if (this._options.exact)
                    this._exactMap = this.__remove(key, this._exactMap, id);
                if (this._options.ignoreCase)
                    this._ignoreCaseMap = this.__remove(key, this._ignoreCaseMap, id);
            },

            _update: function(id, key) {
                var old_key = this._idToKey[id];
                if (old_key == key)
                    return;
                this._remove(id);
                this._insert(id, key);
            },

            _iterate: function(key, direction, callback, context) {
                TreeMap.iterate_from(key, this._exactMap, function(iterKey, value) {
                    for (var id in value) {
                        if (callback.call(context, iterKey, id) === false)
                            return false;
                    }
                    return true;
                }, this, !direction);
            },

            _iterate_ic: function(key, direction, callback, context) {
                TreeMap.iterate_from(key, this._ignoreCaseMap, function(iterKey, value) {
                    for (var id in value) {
                        if (callback.call(context, iterKey, id) === false)
                            return false;
                    }
                    return true;
                }, this, !direction);
            },

            _key_count: function() {
                return this._options.exact ? TreeMap.length(this._exactMap) : 0;
            },

            _key_count_ic: function() {
                return this._options.ignoreCase ? TreeMap.length(this._ignoreCaseMap) : 0;
            },

            key_count_left_ic: function(key) {
                return TreeMap.treeSizeLeft(key, this._ignoreCaseMap);
            },

            key_count_right_ic: function(key) {
                return TreeMap.treeSizeRight(key, this._ignoreCaseMap);
            },

            key_count_distance_ic: function(leftKey, rightKey) {
                return TreeMap.distance(leftKey, rightKey, this._ignoreCaseMap);
            },

            key_count_left: function(key) {
                return TreeMap.treeSizeLeft(key, this._exactMap);
            },

            key_count_right: function(key) {
                return TreeMap.treeSizeRight(key, this._exactMap);
            },

            key_count_distance: function(leftKey, rightKey) {
                return TreeMap.distance(leftKey, rightKey, this._exactMap);
            }

        };
    });
});
Scoped.define("module:Queries.Constrained", [
    "module:Queries",
    "base:Types",
    "base:Objs",
    "base:Tokens",
    "base:Comparators"
], function(Queries, Types, Objs, Tokens, Comparators) {
    return {

        /*
         * 
         * { query: query, options: options }
         * 
         * options:
         *  limit: int || null
         *  skip: int || 0
         *  sort: {
         *    key1: 1 || -1,
         *    key2: 1 || -1
         *  }
         * 
         */

        rectify: function(constrainedQuery) {
            var base = ("options" in constrainedQuery || "query" in constrainedQuery) ? constrainedQuery : {
                query: constrainedQuery
            };
            return Objs.extend({
                query: {},
                options: {}
            }, base);
        },

        skipValidate: function(options, capabilities) {
            if ("skip" in options) {
                if (capabilities)
                    return capabilities.skip;
            }
            return true;
        },

        limitValidate: function(options, capabilities) {
            if ("limit" in options) {
                if (capabilities)
                    return capabilities.limit;
            }
            return true;
        },

        sortValidate: function(options, capabilities) {
            if ("sort" in options) {
                if (capabilities && !capabilities.sort)
                    return false;
                if (capabilities && Types.is_object(capabilities.sort)) {
                    var supported = Objs.all(options.sort, function(dummy, key) {
                        return key in capabilities.sort;
                    });
                    if (!supported)
                        return false;
                }
            }
            return true;
        },

        constraintsValidate: function(options, capabilities) {
            return Objs.all(["skip", "limit", "sort"], function(prop) {
                return this[prop + "Validate"].call(this, options, capabilities);
            }, this);
        },

        validate: function(constrainedQuery, capabilities) {
            constrainedQuery = this.rectify(constrainedQuery);
            return this.constraintsValidate(constrainedQuery.options, capabilities) && Queries.validate(constrainedQuery.query, capabilities.query || {});
        },

        fullConstrainedQueryCapabilities: function(queryCapabilties) {
            return {
                query: queryCapabilties || Queries.fullQueryCapabilities(),
                skip: true,
                limit: true,
                sort: true // can also be false OR a non-empty object containing keys which can be ordered by
            };
        },

        normalize: function(constrainedQuery) {
            constrainedQuery = this.rectify(constrainedQuery);
            return {
                query: Queries.normalize(constrainedQuery.query),
                options: constrainedQuery.options
            };
        },

        serialize: function(constrainedQuery) {
            return JSON.stringify(this.rectify(constrainedQuery));
        },

        unserialize: function(constrainedQuery) {
            return JSON.parse(constrainedQuery);
        },

        hash: function(constrainedQuery) {
            return Tokens.simple_hash(this.serialize(constrainedQuery));
        },

        subsumizes: function(constrainedQuery, constrainedQuery2) {
            constrainedQuery = this.rectify(constrainedQuery);
            constrainedQuery2 = this.rectify(constrainedQuery2);
            var qskip = constrainedQuery.options.skip || 0;
            var qskip2 = constrainedQuery2.options.skip || 0;
            var qlimit = constrainedQuery.options.limit || null;
            var qlimit2 = constrainedQuery2.options.limit || null;
            var qsort = constrainedQuery.options.sort;
            var qsort2 = constrainedQuery.options.sort;
            if (qskip > qskip2)
                return false;
            if (qlimit) {
                if (!qlimit2)
                    return false;
                if (qlimit2 + qskip2 > qlimit + qskip)
                    return false;
            }
            if ((qskip || qlimit) && (qsort || qsort2) && JSON.stringify(qsort) != JSON.stringify(qsort2))
                return false;
            return Queries.subsumizes(constrainedQuery.query, constrainedQuery2.query);
        },

        mergeable: function(constrainedQuery, constrainedQuery2) {
            constrainedQuery = this.rectify(constrainedQuery);
            constrainedQuery2 = this.rectify(constrainedQuery2);
            if (Queries.serialize(constrainedQuery.query) != Queries.serialize(constrainedQuery2.query))
                return false;
            var qopts = constrainedQuery.options;
            var qopts2 = constrainedQuery2.options;
            if (JSON.stringify(qopts.sort || {}) != JSON.stringify(qopts2.sort || {}))
                return false;
            if ("skip" in qopts) {
                if ("skip" in qopts2) {
                    if (qopts.skip <= qopts2.skip)
                        return !qopts.limit || (qopts.skip + qopts.limit >= qopts2.skip);
                    else
                        return !qopts2.limit || (qopts2.skip + qopts2.limit >= qopts.skip);
                } else
                    return (!qopts2.limit || (qopts2.limit >= qopts.skip));
            } else
                return !("skip" in qopts2) || (!qopts.limit || (qopts.limit >= qopts2.skip));
        },

        merge: function(constrainedQuery, constrainedQuery2) {
            constrainedQuery = this.rectify(constrainedQuery);
            constrainedQuery2 = this.rectify(constrainedQuery2);
            var qopts = constrainedQuery.options;
            var qopts2 = constrainedQuery2.options;
            return {
                query: constrainedQuery.query,
                options: {
                    skip: "skip" in qopts ? ("skip" in qopts2 ? Math.min(qopts.skip, qopts2.skip) : null) : null,
                    limit: "limit" in qopts ? ("limit" in qopts2 ? Math.max(qopts.limit, qopts2.limit) : null) : null,
                    sort: constrainedQuery.sort
                }
            };
        }


    };
});
Scoped.define("module:Queries", [
    "base:Types",
    "base:Sort",
    "base:Objs",
    "base:Class",
    "base:Tokens",
    "base:Iterators.ArrayIterator",
    "base:Iterators.FilteredIterator",
    "base:Strings",
    "base:Comparators"
], function(Types, Sort, Objs, Class, Tokens, ArrayIterator, FilteredIterator, Strings, Comparators) {

    var SYNTAX_PAIR_KEYS = {
        "$or": {
            evaluate_combine: Objs.exists
        },
        "$and": {
            evaluate_combine: Objs.all
        }
    };

    var SYNTAX_CONDITION_KEYS = {
        "$in": {
            target: "atoms",
            evaluate_combine: Objs.exists,
            evaluate_single: function(object_value, condition_value) {
                return object_value === condition_value;
            }
        },
        "$gt": {
            target: "atom",
            evaluate_single: function(object_value, condition_value) {
                return object_value > condition_value;
            }
        },
        "$lt": {
            target: "atom",
            evaluate_single: function(object_value, condition_value) {
                return object_value < condition_value;
            }
        },
        "$gte": {
            target: "atom",
            evaluate_single: function(object_value, condition_value) {
                return object_value >= condition_value;
            }
        },
        "$lte": {
            target: "atom",
            evaluate_single: function(object_value, condition_value) {
                return object_value <= condition_value;
            }
        },
        "$eq": {
            target: "atom",
            evaluate_single: function(object_value, condition_value) {
                return object_value === condition_value;
            }
        },
        "$ne": {
            target: "atom",
            evaluate_single: function(object_value, condition_value) {
                return object_value !== condition_value;
            }
        },
        "$regex": {
            target: "atom",
            evaluate_single: function(object_value, condition_value, all_conditions) {
                return Strings.cachedRegExp(condition_value, all_conditions.$options).test(object_value);
            }
        },
        "$options": {
            target: "atom",
            evaluate_single: function(object_value, condition_value) {
                return true;
            }
        },
        "$elemMatch": {
            target: "query",
            no_index_support: true,
            evaluate_combine: Objs.exists
        }
    };


    return {

        /*
         * Syntax:
         *
         * atoms :== [atom, ...]
         * atom :== string | int | bool | float
         * queries :== [query, ...]
         * query :== {pair, ...}
         * pair :== key: value | $or : queries | $and: queries
         * value :== atom | conditions
         * conditions :== {condition, ...}  
         * condition :== $in: atoms | $gt: atom | $lt: atom | $gte: atom | $lte: atom | $regex: atom | $elemMatch
         *
         */

        SYNTAX_PAIR_KEYS: SYNTAX_PAIR_KEYS,

        SYNTAX_CONDITION_KEYS: SYNTAX_CONDITION_KEYS,

        isEqualValueKey: function(query, key) {
            return query && (key in query) && this.is_simple_atom(query[key]);
        },

        validate: function(query, capabilities) {
            return this.validate_query(query, capabilities);
        },

        validate_atoms: function(atoms, capabilities) {
            return Types.is_array(atoms) && Objs.all(atoms, function(atom) {
                return this.validate_atom(atom, capabilities);
            }, this);
        },

        validate_atom: function(atom, capabilities) {
            return !capabilities || !!capabilities.atom;
        },

        validate_queries: function(queries, capabilities) {
            return Types.is_array(queries) && Objs.all(queries, function(query) {
                return this.validate_query(query, capabilities);
            }, this);
        },

        validate_query: function(query, capabilities) {
            return Types.is_object(query) && Objs.all(query, function(value, key) {
                return this.validate_pair(value, key, capabilities);
            }, this);
        },

        validate_pair: function(value, key, capabilities) {
            if (key in this.SYNTAX_PAIR_KEYS) {
                if (capabilities && (!capabilities.bool || !(key in capabilities.bool)))
                    return false;
                return this.validate_queries(value, capabilities);
            }
            return this.validate_value(value, capabilities);
        },

        is_simple_atom: function(value) {
            return !value || (!Types.is_object(value) && value.toString() !== "[object Object]");
        },

        is_query_atom: function(value) {
            return this.is_simple_atom(value) || Objs.all(value, function(v, key) {
                return !(key in this.SYNTAX_CONDITION_KEYS);
            }, this);
        },

        validate_value: function(value, capabilities) {
            return !this.is_query_atom(value) ? this.validate_conditions(value, capabilities) : this.validate_atom(value, capabilities);
        },

        validate_conditions: function(conditions, capabilities) {
            return Types.is_object(conditions) && Objs.all(conditions, function(value, key) {
                return this.validate_condition(value, key, capabilities);
            }, this);
        },

        validate_condition: function(value, key, capabilities) {
            if (capabilities && (!capabilities.conditions || !(key in capabilities.conditions)))
                return false;
            var meta = this.SYNTAX_CONDITION_KEYS[key];
            if (!meta)
                return false;
            if (meta.target === "atoms")
                return this.validate_atoms(value);
            else if (meta.target === "atom")
                return this.validate_atom(value);
            else if (meta.target === "query")
                return this.validate_query(value, capabilities);
            return false;
        },

        normalize: function(query) {
            return Sort.deep_sort(query);
        },

        serialize: function(query) {
            return JSON.stringify(query);
        },

        unserialize: function(query) {
            return JSON.parse(query);
        },

        hash: function(query) {
            return Tokens.simple_hash(this.serialize(query));
        },

        dependencies: function(query) {
            return Object.keys(this.dependencies_query(query, {}));
        },

        dependencies_queries: function(queries, dep) {
            Objs.iter(queries, function(query) {
                dep = this.dependencies_query(query, dep);
            }, this);
            return dep;
        },

        dependencies_query: function(query, dep) {
            Objs.iter(query, function(value, key) {
                dep = this.dependencies_pair(value, key, dep);
            }, this);
            return dep;
        },

        dependencies_pair: function(value, key, dep) {
            return key in this.SYNTAX_PAIR_KEYS ? this.dependencies_queries(value, dep) : this.dependencies_key(key, dep);
        },

        dependencies_key: function(key, dep) {
            dep[key] = (dep[key] || 0) + 1;
            return dep;
        },

        evaluate: function(query, object) {
            return this.evaluate_query(query, object);
        },

        evaluate_query: function(query, object) {
            return Objs.all(query, function(value, key) {
                return this.evaluate_pair(value, key, object);
            }, this);
        },

        evaluate_pair: function(value, key, object) {
            if (key in this.SYNTAX_PAIR_KEYS) {
                return this.SYNTAX_PAIR_KEYS[key].evaluate_combine.call(Objs, value, function(query) {
                    return this.evaluate_query(query, object);
                }, this);
            } else
                return this.evaluate_key_value(value, key, object);
        },

        evaluate_key_value: function(value, key, object) {
            var i = key.indexOf(".");
            return i >= 0 ? this.evaluate_key_value(value, key.substring(i + 1), object[key.substring(0, i)]) : this.evaluate_value(value, object[key]);
        },

        evaluate_value: function(value, object_value) {
            return !this.is_query_atom(value) ? this.evaluate_conditions(value, object_value) : this.evaluate_atom(value, object_value);
        },

        evaluate_atom: function(value, object_value) {
            return value === object_value;
        },

        evaluate_conditions: function(value, object_value) {
            return Objs.all(value, function(condition_value, condition_key) {
                return this.evaluate_condition(condition_value, condition_key, object_value, value);
            }, this);
        },

        evaluate_condition: function(condition_value, condition_key, object_value, all_conditions) {
            var rec = this.SYNTAX_CONDITION_KEYS[condition_key];
            if (rec.target === "atoms") {
                return rec.evaluate_combine.call(Objs, condition_value, function(condition_single_value) {
                    return rec.evaluate_single.call(this, object_value, condition_single_value, all_conditions);
                }, this);
            } else if (rec.target === "atom")
                return rec.evaluate_single.call(this, object_value, condition_value, all_conditions);
            else if (rec.target === "query") {
                return rec.evaluate_combine.call(Objs, object_value, function(object_single_value) {
                    /*
                     * This fixes the case {value: foo}, {value: bar} where both foo and bar are objects.
                     * I am assuming that the actual fix would be to make queries work with sub queries...
                     */
                    return Types.is_object(condition_value) && Types.is_object(object_single_value) ?
                        this.evaluate_query(condition_value, object_single_value) :
                        this.evaluate_query({
                            value: condition_value
                        }, {
                            value: object_single_value
                        });
                }, this);
            }
        },

        rangeSuperQueryDiffQuery: function(superCandidate, subCandidate) {
            if (!Objs.keyEquals(superCandidate, subCandidate))
                return false;
            var rangeKey = Objs.objectify(["$gt", "$lt", "$gte", "$lte"]);
            var ors = [];
            var result = {};
            var iterResult = Objs.iter(superCandidate, function(superValue, key) {
                superValue = Objs.clone(superValue, 1);
                var subValue = Objs.clone(subCandidate[key], 1);
                Objs.iter(rangeKey, function(dummy, k) {
                    if (superValue[k] && subValue[k] && superValue[k] === subValue[k]) {
                        delete superValue[k];
                        delete subValue[k];
                    }
                });
                if (Comparators.deepEqual(superValue, subValue, -1)) {
                    result[key] = superValue;
                    return true;
                }
                var splitSuper = Objs.filter(superValue, function(dummy, key) {
                    return !rangeKey[key];
                });
                var splitSub = Objs.filter(subValue, function(dummy, key) {
                    return !rangeKey[key];
                });
                if (!Comparators.deepEqual(splitSuper, splitSub, -1))
                    return false;
                var ret = Objs.clone(superValue, 1);
                if (subValue.$gt || subValue.$gte) {
                    if (subValue.$lt || subValue.$lte) {
                        if (superValue.$gt || superValue.$gte) {
                            if ((superValue.$gt || superValue.$gte) > (subValue.$gt || subValue.$gte))
                                return false;
                        }
                        if (superValue.$lt || superValue.$lte) {
                            if ((superValue.$lt || superValue.$lte) < (subValue.$lt || subValue.$lte))
                                return false;
                        }
                        var retLow = Objs.clone(ret, 1);
                        var retHigh = Objs.clone(ret, 1);
                        delete retLow.$lt;
                        delete retLow.$lte;
                        retLow[subValue.$gt ? "$lte" : "$lt"] = subValue.$gt || subValue.$gte;
                        delete retHigh.$gt;
                        delete retHigh.$gte;
                        retHigh[subValue.$lt ? "$gte" : "$gt"] = subValue.$lt || subValue.$lte;
                        ors.push(Objs.objectBy(key, retLow));
                        ors.push(Objs.objectBy(key, retHigh));
                        return true;
                    } else {
                        if (superValue.$lt || superValue.$lte)
                            return false;
                        if (superValue.$gt || superValue.$gte) {
                            if ((superValue.$gt || superValue.$gte) > (subValue.$gt || subValue.$gte))
                                return false;
                        }
                        ret[subValue.$gt ? "$lte" : "$lt"] = subValue.$gt || subValue.$gte;
                    }
                } else if (subValue.$lt || subValue.$lte) {
                    if (superValue.$gt || superValue.$gte)
                        return false;
                    if (superValue.$lt || superValue.$lte) {
                        if ((superValue.$lt || superValue.$lte) < (subValue.$lt || subValue.$lte))
                            return false;
                    }
                    ret[subValue.$lt ? "$gte" : "$gt"] = subValue.$lt || subValue.$lte;
                } else
                    return false;
                result[key] = ret;
            });
            if (!iterResult)
                return false;
            if (ors.length > 0)
                result.$or = result.$or ? result.$or.concat(ors) : ors;
            return result;
        },

        subsumizes: function(query, query2) {
            // This is very simple at this point
            if (!Types.is_object(query) || !Types.is_object)
                return query == query2;
            for (var key in query) {
                if (!(key in query2) || !this.subsumizes(query[key], query2[key]))
                    return false;
            }
            return true;
        },

        fullQueryCapabilities: function() {
            var bool = {};
            Objs.iter(this.SYNTAX_PAIR_KEYS, function(dummy, key) {
                bool[key] = true;
            });
            var conditions = {};
            Objs.iter(this.SYNTAX_CONDITION_KEYS, function(dummy, key) {
                conditions[key] = true;
            });
            return {
                atom: true,
                bool: bool,
                conditions: conditions
            };
        },

        mergeConditions: function(conditions1, conditions2) {
            if (!Types.is_object(conditions1))
                conditions1 = {
                    "$eq": conditions1
                };
            if (!Types.is_object(conditions2))
                conditions2 = {
                    "$eq": conditions2
                };
            var fail = false;
            var obj = Objs.clone(conditions1, 1);
            Objs.iter(conditions2, function(target, condition) {
                if (fail)
                    return false;
                if (condition in obj) {
                    var base = obj[condition];
                    if (Strings.starts_with(condition, "$eq"))
                        fail = true;
                    if (Strings.starts_with(condition, "$in")) {
                        base = Objs.objectify(base);
                        obj[condition] = [];
                        fail = true;
                        Objs.iter(target, function(x) {
                            if (base[x]) {
                                obj[condition].push(x);
                                fail = false;
                            }
                        });
                    }
                    if (Strings.starts_with(condition, "$gt"))
                        if (Comparators.byValue(base, target) < 0)
                            obj[condition] = target;
                    if (Strings.starts_with(condition, "$lt"))
                        if (Comparators.byValue(base, target) > 0)
                            obj[condition] = target;
                } else
                    obj[condition] = target;
            }, this);
            if (fail)
                obj = {
                    "$in": []
                };
            return obj;
        },

        disjunctiveNormalForm: function(query, mergeKeys) {
            query = Objs.clone(query, 1);
            var factors = [];
            if (query.$or) {
                var factor = [];
                Objs.iter(query.$or, function(q) {
                    Objs.iter(this.disjunctiveNormalForm(q, mergeKeys).$or, function(q2) {
                        factor.push(q2);
                    }, this);
                }, this);
                factors.push(factor);
                delete query.$or;
            }
            if (query.$and) {
                Objs.iter(query.$and, function(q) {
                    var factor = [];
                    Objs.iter(this.disjunctiveNormalForm(q, mergeKeys).$or, function(q2) {
                        factor.push(q2);
                    }, this);
                    factors.push(factor);
                }, this);
                delete query.$and;
            }
            var result = [];
            var helper = function(base, i) {
                if (i < factors.length) {
                    Objs.iter(factors[i], function(factor) {
                        var target = Objs.clone(base, 1);
                        Objs.iter(factor, function(value, key) {
                            if (key in target) {
                                if (mergeKeys)
                                    target[key] = this.mergeConditions(target[key], value);
                                else {
                                    if (!target.$and)
                                        target.$and = [];
                                    target.$and.push(Objs.objectBy(key, value));
                                }
                            } else
                                target[key] = value;
                        }, this);
                        helper(target, i + 1);
                    }, this);
                } else
                    result.push(base);
            };
            helper(query, 0);
            return {
                "$or": result
            };
        },

        simplifyQuery: function(query) {
            var result = {};
            Objs.iter(query, function(value, key) {
                if (key in this.SYNTAX_PAIR_KEYS) {
                    var arr = [];
                    var had_true = false;
                    Objs.iter(value, function(q) {
                        var qs = this.simplifyQuery(q);
                        if (Types.is_empty(qs))
                            had_true = true;
                        else
                            arr.push(qs);
                    }, this);
                    if ((key === "$and" && arr.length > 0) || (key === "$or" && !had_true))
                        result[key] = arr;
                } else if (Types.is_object(value) && value !== null) {
                    var conds = this.simplifyConditions(value);
                    if (!Types.is_empty(conds))
                        result[key] = conds;
                } else
                    result[key] = value;
            }, this);
            return result;
        },

        simplifiedDNF: function(query, mergeKeys) {
            query = this.simplifyQuery(this.disjunctiveNormalForm(query, true));
            return !Types.is_empty(query) ? query : {
                "$or": [{}]
            };
        },

        simplifyConditions: function(conditions) {
            var result = {};
            Objs.iter(["", "ic"], function(add) {
                if (conditions["$eq" + add] || conditions["$in" + add]) {
                    var filtered = Objs.filter(conditions["$eq" + add] ? [conditions["$eq" + add]] : conditions["$in" + add], function(inkey) {
                        return this.evaluate_conditions(conditions, inkey);
                    }, this);
                    result[(filtered.length === 1 ? "$eq" : "$in") + add] = filtered.length === 1 ? filtered[0] : filtered;
                } else {
                    var gt = null;
                    var lt = null;
                    var lte = false;
                    var gte = false;
                    var compare = Comparators.byValue;
                    if (conditions["$gt" + add])
                        gt = conditions["$gt" + add];
                    if (conditions["$lt" + add])
                        gt = conditions["$lt" + add];
                    if (conditions["$gte" + add] && (gt === null || compare(gt, conditions["$gte" + add]) < 0)) {
                        gte = true;
                        gt = conditions["$gte" + add];
                    }
                    if (conditions["$lte" + add] && (lt === null || compare(lt, conditions["$lte" + add]) > 0)) {
                        lte = true;
                        lt = conditions["$lte" + add];
                    }
                    if (lt !== null)
                        result[(lte ? "$lte" : "$lt") + add] = lt;
                    if (gt !== null)
                        result[(gte ? "$gte" : "$gt") + add] = gt;
                }
            }, this);
            return result;
        },

        mapKeyValue: function(query, callback, context) {
            return this.mapKeyValueQuery(query, callback, context);
        },

        mapKeyValueQuery: function(query, callback, context) {
            var result = {};
            Objs.iter(query, function(value, key) {
                result = Objs.extend(result, this.mapKeyValuePair(value, key, callback, context));
            }, this);
            return result;
        },

        mapKeyValueQueries: function(queries, callback, context) {
            return Objs.map(queries, function(query) {
                return this.mapKeyValueQuery(query, callback, context);
            }, this);
        },

        mapKeyValuePair: function(value, key, callback, context) {
            if (key in this.SYNTAX_PAIR_KEYS)
                return Objs.objectBy(key, this.mapKeyValueQueries(value, callback, context));
            if (this.is_query_atom(value))
                return callback.call(context, key, value);
            var result = {};
            Objs.iter(value, function(condition_value, condition_key) {
                result[condition_key] = this.mapKeyValueCondition(condition_value, key, callback, context);
            }, this);
            return Objs.objectBy(key, result);
        },

        mapKeyValueCondition: function(condition_value, key, callback, context) {
            var is_array = Types.is_array(condition_value);
            if (!is_array)
                condition_value = [condition_value];
            var result = Objs.map(condition_value, function(value) {
                return Objs.peek(callback.call(context, key, value));
            }, this);
            return is_array ? result : result[0];
        },

        queryDeterminedByAttrs: function(query, attributes, requireInequality) {
            return Objs.exists(query, function(value, key) {
                if (key === "$and") {
                    return Objs.exists(value, function(q) {
                        return this.queryDeterminedByAttrs(q, attributes, requireInequality);
                    }, this);
                } else if (key === "$or") {
                    return Objs.all(value, function(q) {
                        return this.queryDeterminedByAttrs(q, attributes, requireInequality);
                    }, this);
                } else
                    return key in attributes && (!requireInequality || attributes[key] !== value);
            }, this);
        },

        searchTextQuery: function(text, ignoreCase) {
            return {
                $regex: Strings.regexEscape(text || ""),
                $options: ignoreCase ? "i" : ""
            };
        }

    };
});
Scoped.extend("module:Queries.AbstractQueryBuilder", [
    "base:Class",
    "base:Comparators",
    "base:Events.EventsMixin",
    "base:Objs"
], function(Class, Comparators, EventsMixin, Objs, scoped) {
    return Class.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {
        return {

            constructor: function() {
                inherited.constructor.call(this);
                this.__query = {};
            },

            _queryChanged: function() {
                var newQuery = this._buildQuery();
                if (!Comparators.deepEqual(this.__query, newQuery)) {
                    this.__query = newQuery;
                    this.trigger("change");
                }
            },

            getQuery: function() {
                return Objs.clone(this.__query, 1);
            },

            _buildQuery: function() {
                throw "Not implemented";
            }

        };
    }]);
});



Scoped.extend("module:Queries.SimpleQueryBuilder", [
    "module:Queries.AbstractQueryBuilder"
], function(AbstractQueryBuilder, scoped) {
    return AbstractQueryBuilder.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(query, queryMap, queryCtx) {
                inherited.constructor.call(this);
                this.__queryMap = queryMap;
                this.__queryCtx = queryCtx;
                this.__userQuery = null;
                this.setQuery(query);
            },

            setQuery: function(query) {
                this.__userQuery = query ? (this.__queryMap ? this.__queryMap.call(this.__queryCtx || this, query) : query) : {};
                this._queryChanged();
            },

            _buildQuery: function() {
                return this.__userQuery;
            }

        };
    });
});


Scoped.extend("module:Queries.AndQueryBuilder", [
    "module:Queries.AbstractQueryBuilder",
    "base:Objs",
    "base:Types"
], function(AbstractQueryBuilder, Objs, Types, scoped) {
    return AbstractQueryBuilder.extend({
        scoped: scoped
    }, function(inherited) {

        return {

            constructor: function() {
                inherited.constructor.call(this);
                this.__queries = {};
            },

            destroy: function() {
                Objs.iter(this.__queries, this.removeQuery, this);
                inherited.destroy.call(this);
            },

            addQuery: function(query) {
                this.__queries[query.cid()] = query;
                query.on("change", this._queryChanged, this);
                this._queryChanged();
                return query;
            },

            removeQuery: function(query) {
                delete this.__queries[query.cid()];
                query.off(null, null, this);
                this._queryChanged();
                return query;
            },

            _buildQuery: function() {
                var arr = Objs.values(this.__queries).map(function(query) {
                    return query.getQuery();
                }).filter(function(query) {
                    return !Types.is_empty(query);
                });
                switch (arr.length) {
                    case 0:
                        return {};
                    case 1:
                        return arr[0];
                    default:
                        return {
                            "$and": arr
                        };
                }
            }

        };

    });
});



Scoped.extend("module:Queries.ConstrainedQueryBuilder", [
    "base:Class",
    "base:Comparators",
    "base:Events.EventsMixin"
], function(Class, Comparators, EventsMixin, scoped) {
    return Class.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {
        return {

            constructor: function(queryBuilder, options) {
                inherited.constructor.call(this);
                this.__queryBuilder = queryBuilder;
                this.__options = options || {};
                this.__queryBuilder.on("change", function() {
                    this.trigger("change");
                }, this);
            },

            destroy: function() {
                this.__queryBuilder.off(null, null, this);
                inherited.destroy.call(this);
            },

            getOptions: function() {
                return this.__options;
            },

            setOptions: function(options) {
                options = options || {};
                if (Comparators.deepEqual(options, this.__options))
                    return;
                this.__options = options;
                this.trigger("change");
            },

            getQuery: function() {
                return this.getQueryBuilder().getQuery();
            },

            getQueryBuilder: function() {
                return this.__queryBuilder;
            },

            getConstrainedQuery: function() {
                return {
                    query: this.getQuery(),
                    options: this.getOptions()
                };
            }

        };
    }]);
});


Scoped.extend("module:Queries.RangeQueryBuilder", [
    "module:Queries.AbstractQueryBuilder",
    "base:Objs"
], function(AbstractQueryBuilder, Objs, scoped) {
    return AbstractQueryBuilder.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(key, lowerBound, upperBound) {
                inherited.constructor.call(this);
                this.__key = key;
                this.__lowerBound = lowerBound;
                this.__upperBound = upperBound;
                this._queryChanged();
            },

            _buildQuery: function() {
                return Objs.objectBy(this.__key, {
                    "$gte": this.__lowerBound,
                    "$lte": this.__upperBound
                });
            },

            touch: function(lowerBound, upperBound) {
                upperBound = upperBound || lowerBound;
                var changed = false;
                if (lowerBound < this.__lowerBound) {
                    changed = true;
                    this.__lowerBound = lowerBound;
                }
                if (upperBound > this.__upperBound) {
                    changed = true;
                    this.__upperBound = upperBound;
                }
                if (changed)
                    this._queryChanged();
            },

            setLowerBound: function(lowerBound) {
                this.__lowerBound = lowerBound;
                this._queryChanged();
            },

            setUpperBound: function(upperBound) {
                this.__upperBound = upperBound;
                this._queryChanged();
            }

        };
    });
});
Scoped.define("module:Queries.Engine", [
    "module:Queries",
    "module:Queries.Constrained",
    "base:Strings",
    "base:Types",
    "base:Objs",
    "base:Promise",
    "base:Comparators",
    "base:Iterators.SkipIterator",
    "base:Iterators.LimitIterator",
    "base:Iterators.SortedIterator",
    "base:Iterators.FilteredIterator",
    "base:Iterators.SortedOrIterator",
    "base:Iterators.PartiallySortedIterator",
    "base:Iterators.ArrayIterator",
    "base:Iterators.LazyMultiArrayIterator"
], function(Queries, Constrained, Strings, Types, Objs, Promise, Comparators, SkipIterator, LimitIterator, SortedIterator, FilteredIterator, SortedOrIterator, PartiallySortedIterator, ArrayIterator, LazyMultiArrayIterator) {
    return {

        indexQueryConditionsSize: function(conds, index, ignoreCase) {
            var postfix = ignoreCase ? "_ic" : "";
            var info = index.info();
            var subSize = info.row_count;
            var rows_per_key = info.row_count / Math.max(info["key_count" + postfix], 1);
            if (conds.$eq)
                subSize = rows_per_key;
            else if (conds.$in)
                subSize = rows_per_key * conds.$in.length;
            else {
                var keys = 0;
                var g = null;
                if (conds.$gt || conds.$gte) {
                    g = conds.$gt || conds.$gte;
                    if (conds.$gt)
                        keys--;
                }
                var l = null;
                if (conds.$lt || conds.$lte) {
                    l = conds.$lt || conds.$lte;
                    if (conds.$lt)
                        keys--;
                }
                if (g !== null && l !== null)
                    keys += index["key_count_distance" + postfix](g, l);
                else if (g !== null)
                    keys += index["key_count_right" + postfix](g);
                else if (l !== null)
                    keys += index["key_count_left" + postfix](l);
                subSize = keys * rows_per_key;
            }
            return subSize;
        },

        indexQuerySize: function(queryDNF, key, index) {
            var acc = 0;
            var info = index.info();
            Objs.iter(queryDNF.$or, function(q) {
                if (!(key in q)) {
                    acc = null;
                    return false;
                }
                var conds = q[key];
                var findSize = info.row_count;
                if (index.options().exact)
                    findSize = Math.min(findSize, this.indexQueryConditionsSize(conds, index, false));
                if (index.options().ignoreCase)
                    findSize = Math.min(findSize, this.indexQueryConditionsSize(conds, index, true));
                acc += findSize;
            }, this);
            return acc;
        },

        queryPartially: function(constrainedQuery, constrainedQueryCapabilities) {
            var simplified = {
                query: constrainedQuery.query,
                options: {}
            };
            if (constrainedQuery.options.sort) {
                var first = Objs.ithKey(constrainedQuery.options.sort, 0);
                simplified.options.sort = {};
                simplified.options.sort[first] = constrainedQuery.options.sort[first];
            }
            return Constrained.validate(simplified, constrainedQueryCapabilities);
        },

        compileQuery: function(constrainedQuery, constrainedQueryCapabilities, constrainedQueryFunction, constrainedQueryContext) {
            constrainedQuery = Constrained.rectify(constrainedQuery);
            var sorting_supported = Constrained.sortValidate(constrainedQuery.options, constrainedQueryCapabilities);
            var query_supported = Queries.validate(constrainedQuery.query, constrainedQueryCapabilities.query || {});
            var skip_supported = Constrained.skipValidate(constrainedQuery.options, constrainedQueryCapabilities);
            var limit_supported = Constrained.limitValidate(constrainedQuery.options, constrainedQueryCapabilities);
            var post_actions = {
                skip: null,
                limit: null,
                filter: null,
                sort: null
            };
            if (!query_supported || !sorting_supported || !skip_supported) {
                post_actions.skip = constrainedQuery.options.skip;
                delete constrainedQuery.options.skip;
                if ("limit" in constrainedQuery.options && limit_supported && query_supported && sorting_supported)
                    constrainedQuery.options.limit += post_actions.skip;
            }
            if (!query_supported || !sorting_supported || !limit_supported) {
                post_actions.limit = constrainedQuery.options.limit;
                delete constrainedQuery.options.limit;
            }
            if (!sorting_supported) {
                post_actions.sort = constrainedQuery.options.sort;
                delete constrainedQuery.options.sort;
            }
            if (!query_supported) {
                post_actions.filter = constrainedQuery.query;
                constrainedQuery.query = {};
            }
            var query_result = constrainedQueryFunction.call(constrainedQueryContext, constrainedQuery);
            return query_result.mapSuccess(function(iter) {
                iter = this._queryResultRectify(iter, false);
                if (post_actions.filter) {
                    iter = (new FilteredIterator(iter, function(row) {
                        return Queries.evaluate(post_actions.filter, row);
                    })).auto_destroy(iter, true);
                }
                if (post_actions.sort)
                    iter = (new SortedIterator(iter, Comparators.byObject(post_actions.sort))).auto_destroy(iter, true);
                if (post_actions.skip)
                    iter = (new SkipIterator(iter, post_actions.skip)).auto_destroy(iter, true);
                if (post_actions.limit)
                    iter = (new LimitIterator(iter, post_actions.limit)).auto_destroy(iter, true);
                return iter;
            }, this);
        },

        compileIndexQuery: function(constrainedDNFQuery, key, index) {
            var fullQuery = Objs.exists(constrainedDNFQuery.query.$or, function(query) {
                return !(key in query);
            });
            var primaryKeySort = constrainedDNFQuery.options.sort && Objs.ithKey(constrainedDNFQuery.options.sort, 0) === key;
            var primarySortDirection = primaryKeySort ? constrainedDNFQuery.options.sort[key] : 1;
            var iter;
            var ignoreCase = !index.options().exact;
            if (fullQuery) {
                var materialized = [];
                index["itemIterate" + (ignoreCase ? "_ic" : "")](null, primarySortDirection, function(dataKey, data) {
                    materialized.push(data);
                });
                iter = new ArrayIterator(materialized);
            } else {
                iter = new SortedOrIterator(Objs.map(constrainedDNFQuery.query.$or, function(query) {
                    var iter;
                    var conds = query[key];
                    if (!primaryKeySort && index.options().ignoreCase && index.options().exact) {
                        if (this.indexQueryConditionsSize(conds, index, true) < this.indexQueryConditionsSize(conds, index, false))
                            ignoreCase = true;
                    }
                    var postfix = ignoreCase ? "_ic" : "";
                    if (conds.$eq || !Types.is_object(conds)) {
                        var materialized = [];
                        var value = Types.is_object(conds) ? conds.$eq : conds;
                        index["itemIterate" + postfix](value, primarySortDirection, function(dataKey, data) {
                            if (dataKey !== value)
                                return false;
                            materialized.push(data);
                        });
                        iter = new ArrayIterator(materialized);
                    } else if (conds.$in) {
                        var i = 0;
                        iter = new LazyMultiArrayIterator(function() {
                            if (i >= conds.$in.length)
                                return null;
                            var materialized = [];
                            index["itemIterate" + postfix](conds.$in[i], primarySortDirection, function(dataKey, data) {
                                if (dataKey !== conds["in"][i])
                                    return false;
                                materialized.push(data);
                            });
                            i++;
                            return materialized;
                        });
                    } else {
                        var currentKey = null;
                        var lastKey = null;
                        if (conds.$gt || conds.$gte)
                            currentKey = conds.$gt || conds.$gte;
                        if (conds.$lt || conds.$lte)
                            lastKey = conds.$lt || conds.$lte;
                        if (primarySortDirection < 0) {
                            var temp = currentKey;
                            currentKey = lastKey;
                            lastKey = temp;
                        }
                        iter = new LazyMultiArrayIterator(function() {
                            if (currentKey !== null && lastKey !== null) {
                                if (Math.sign((index.comparator())(currentKey, lastKey)) === Math.sign(primarySortDirection))
                                    return null;
                            }
                            var materialized = [];
                            index["itemIterate" + postfix](currentKey, primarySortDirection, function(dataKey, data) {
                                if (currentKey === null)
                                    currentKey = dataKey;
                                if (dataKey !== currentKey) {
                                    currentKey = dataKey;
                                    return false;
                                }
                                materialized.push(data);
                            });
                            return materialized;
                        });
                    }
                    return iter;
                }, this), index.comparator());
            }
            iter = (new FilteredIterator(iter, function(row) {
                return Queries.evaluate(constrainedDNFQuery.query, row);
            })).auto_destroy(iter, true);
            if (constrainedDNFQuery.options.sort) {
                if (primaryKeySort)
                    iter = (new PartiallySortedIterator(iter, Comparators.byObject(constrainedDNFQuery.options.sort), function(first, next) {
                        return first[key] === next[key];
                    })).auto_destroy(iter, true);
                else
                    iter = (new SortedIterator(iter, Comparators.byObject(constrainedDNFQuery.options.sort))).auto_destroy(iter, true);
            }
            if (constrainedDNFQuery.options.skip)
                iter = (new SkipIterator(iter, constrainedDNFQuery.options.skip)).auto_destroy(iter, true);
            if (constrainedDNFQuery.options.limit)
                iter = (new LimitIterator(iter, constrainedDNFQuery.options.limit)).auto_destroy(iter, true);
            return Promise.value(iter);
        },

        compileIndexedQuery: function(constrainedQuery, constrainedQueryCapabilities, constrainedQueryFunction, constrainedQueryContext, indices) {
            constrainedQuery = Constrained.rectify(constrainedQuery);
            indices = indices || {};
            if (this.queryPartially(constrainedQuery, constrainedQueryCapabilities) || Types.is_empty(indices))
                return this.compileQuery(constrainedQuery, constrainedQueryCapabilities, constrainedQueryFunction, constrainedQueryContext);
            var dnf = Queries.simplifiedDNF(constrainedQuery.query, true);
            if (constrainedQuery.options.sort) {
                var first = Objs.ithKey(constrainedQuery.options.sort, 0);
                if (indices[first]) {
                    return this.compileIndexQuery({
                        query: dnf,
                        options: constrainedQuery.options
                    }, first, indices[first]);
                }
            }
            var smallestSize = null;
            var smallestKey = null;
            Objs.iter(indices, function(index, key) {
                var size = this.indexQuerySize(dnf, key, index);
                if (size !== null && (smallestSize === null || size < smallestSize)) {
                    smallestSize = size;
                    smallestKey = key;
                }
            }, this);
            if (smallestKey !== null)
                return this.compileIndexQuery({
                    query: dnf,
                    options: constrainedQuery.options
                }, smallestKey, indices[smallestKey]);
            else
                return this.compileQuery(constrainedQuery, constrainedQueryCapabilities, constrainedQueryFunction, constrainedQueryContext);
        },

        _queryResultRectify: function(result, materialize) {
            result = result || [];
            if (Types.is_array(result) === materialize)
                return result;
            if (materialize)
                return result.asArray();
            return new ArrayIterator(result);
        }

    };
});
Scoped.define("module:Stores.AssocStore", [
                                           "module:Stores.BaseStore",
                                           "base:Promise",
                                           "base:Objs"
                                           ], function (BaseStore, Promise, Objs, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			_read_key: function (key) {},
			_write_key: function (key, value) {},
			_remove_key: function (key) {},
			_iterate: function () {},

			constructor: function (options) {
				options = options || {};
				options.create_ids = true;
				inherited.constructor.call(this, options);
			},

			_insert: function (data) {
				return Promise.tryCatch(function () {
					this._write_key(data[this._id_key], data);
					return data;
				}, this);
			},

			_remove: function (id) {
				return Promise.tryCatch(function () {
					var row = this._read_key(id);
					if (row && !this._remove_key(id))
						return null;
					return row;
				}, this);
			},

			_get: function (id) {
				return Promise.tryCatch(function () {
					return this._read_key(id);
				}, this);
			},

			_update: function (id, data) {
				return Promise.tryCatch(function () {
					var row = this._read_key(id);
					if (row) {
						if (this._id_key in data) {
							this._remove_key(id);
							id = data[this._id_key];
							delete data[this._id_key];
						}
						Objs.extend(row, data);
						this._write_key(id, row);
					}
					return row;
				}, this);
			},

			_query: function (query, options) {
				return Promise.tryCatch(function () {
					return this._iterate();
				}, this);
			}

		};
	});
});

//Stores everything temporarily in the browser's memory using map

Scoped.define("module:Stores.MemoryMapStore", [
    "module:Stores.AssocStore",
    "base:Iterators.FilteredIterator",
    "base:Iterators.NativeMapIterator",
    "base:Objs"
], function (AssocStore, FilteredIterator, NativeMapIterator, Objs, scoped) {
	return AssocStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (options) {
				inherited.constructor.call(this, options);
				this.__map = new Map();
			},

			_read_key: function (key) {
				return this.__map.get(key + "");
			},

			_write_key: function (key, value) {
				this.__map.set(key + "", value);
			},

			_remove_key: function (key) {
				this.__map['delete'](key + "");
			},

			_iterate: function () {
				var nativeMapIter = new NativeMapIterator(this.__map);
				return (new FilteredIterator(nativeMapIter, function (item) {
					return !!item;
				})).auto_destroy(nativeMapIter, true);
			},
			
			_count: function (query) {
				return query ? inherited._count.call(this, query) : this.__map.size;
			}						

		};
	});
});

//Stores everything temporarily in the browser's memory

Scoped.define("module:Stores.MemoryStore", [
    "module:Stores.AssocStore",
    //"base:Iterators.ObjectValuesIterator",
    "base:Iterators.FilteredIterator",
    "base:Iterators.ArrayIterator",
    "base:Objs",
	"base:Promise"
], function (AssocStore, FilteredIterator, ArrayIterator, Objs, Promise, scoped) {
	return AssocStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (options) {
				inherited.constructor.call(this, options);
				// We reserve index 0.
				this.__dataByIndex = [null];
				this.__indexById = {};
				this.__count = 0;
			},

			_read_key: function (key) {
				var i = this.__indexById[key];
				return i ? this.__dataByIndex[i] : undefined;
			},

			_write_key: function (key, value) {
				var i = this.__indexById[key];
				if (!i) {
					i = this.__dataByIndex.length;
					this.__indexById[key] = i;
					this.__count++;
				}
				this.__dataByIndex[i] = value;
			},

			_remove_key: function (key) {
				var i = this.__indexById[key];
				if (i) {
					delete this.__indexById[key];
					delete this.__dataByIndex[i];
					this.__count--;
				}				
			},

			_iterate: function () {
				var arrIter = new ArrayIterator(this.__dataByIndex);
				return (new FilteredIterator(arrIter, function (item) {
					return !!item;
				})).auto_destroy(arrIter, true);
				//return new ObjectValuesIterator(this.__data);
			},
			
			_count: function (query) {
				return query ? inherited._count.call(this, query) : Promise.value(this.__count);
			}

		};
	});
});

Scoped.define("module:Stores.BaseStore", [
  "base:Class",
  "base:Events.EventsMixin",
  "module:Stores.ReadStoreMixin",
  "module:Stores.WriteStoreMixin",
  "base:Promise",
  "base:Objs",
  "module:Stores.MemoryIndex"
], function (Class, EventsMixin, ReadStoreMixin, WriteStoreMixin, Promise, Objs, MemoryIndex, scoped) {
	return Class.extend({scoped: scoped}, [EventsMixin, ReadStoreMixin, WriteStoreMixin, function (inherited) {			
		return {

			constructor: function (options) {
				inherited.constructor.call(this);
				this._initializeReadStore(options);
				this._initializeWriteStore(options);
			},

			_ensure_index: function (key) {
				if (!(key in this.indices))
					this.indices[key] = new MemoryIndex(this, key);
			},	

			ensure_index: function (key) {
				return this._ensure_index(key);
			},

			getBy: function (key, value, ctx) {
				if (key === this.id_key())
					return this.get(value, ctx);
				return this.query(Objs.objectBy(key, value), {limit: 1}).mapSuccess(function (iter) {
                    var result = iter.next();
					iter.destroy();
					return result;
				});
			},

			clear: function (ctx) {
				return this.query(null, null, ctx).mapSuccess(function (iter) {
					var promise = Promise.and();
					while (iter.hasNext()) {
						var obj = iter.next();
						promise = promise.and(this.remove(obj[this._id_key], ctx));
					}
					iter.destroy();
					return promise;
				}, this);
			}

		};
	}]);
});

Scoped.define("module:Stores.ReadStoreMixin", [
                                               "module:Queries.Engine",
                                               "module:Stores.StoreException",                                               
                                               "base:Promise",
                                               "base:Objs"
                                               ], function (QueryEngine, StoreException, Promise, Objs) {
	return {

		_initializeReadStore: function (options) {
			options = options || {};
			this.indices = {};
			this._watcher = options.watcher || null;
			this._capabilities = options.capabilities || {};
		},
		
		watcher: function () {
			return this._watcher;
		},

		_get: function (id, ctx) {
			return Promise.create(null, new StoreException("unsupported: get"));
		},

		_query_capabilities: function () {
			return this._capabilities;
		},

		_query: function (query, options, ctx) {
			return Promise.create(null, new StoreException("unsupported: query"));
		},

		get: function (id, ctx) {
			return this._get(id, ctx);
		},
		
		count: function (query, ctx) {
			return this._count(query, ctx);
		},
		
		_count: function (query, ctx) {
			return this.query(query, {}, ctx).mapSuccess(function (iter) {
				return iter.asArray().length;
			});
		},

		query: function (query, options, ctx) {
			query = Objs.clone(query || {}, -1);
			options = Objs.clone(options, -1);
			if (options) {
				if (options.limit)
					options.limit = parseInt(options.limit, 10);
				if (options.skip)
					options.skip = parseInt(options.skip, 10);
			}
			return QueryEngine.compileIndexedQuery(
					{query: query, options: options || {}},
					this._query_capabilities(),
					function (constrainedQuery) {
						return this._query(constrainedQuery.query, constrainedQuery.options, ctx);
					},
					this,
					this.indices);
		},

		findBy: function (query, ctx) {
			return this.query(query, {
				limit: 1
			}, ctx).mapSuccess(function (result) {
				return result.next();
			});
		},
		
		serialize: function (ctx) {
			return this.query({}, {}, ctx).mapSuccess(function (iter) {
				return iter.asArray();
			});
		}

	};
});


Scoped.define("module:Stores.ReadStore", [
                                          "base:Class",
                                          "module:Stores.ReadStoreMixin"
                                          ], function (Class, ReadStoreMixin, scoped) {
	return Class.extend({scoped: scoped}, [ReadStoreMixin, function (inherited) {			
		return {

			constructor: function (options) {
				inherited.constructor.call(this);
				this._initializeReadStore(options);
			}

		};
	}]);
});


Scoped.define("module:Stores.StoreException", ["base:Exceptions.Exception"], function (Exception, scoped) {
	return Exception.extend({scoped: scoped}, {});
});

Scoped.define("module:Stores.StoreHistory", [
	"base:Class",
	"base:Classes.CriticalSectionMixin",
	"base:Events.EventsMixin",
	"base:Objs",
	"base:Types",
	"base:Promise",
	"module:Stores.MemoryStore"
], function (Class, CriticalSectionMixin, EventsMixin, Objs, Types, Promise, MemoryStore, scoped) {
	return Class.extend({scoped: scoped}, [EventsMixin, CriticalSectionMixin, function (inherited) {
		return {

			constructor: function (sourceStore, historyStore, options) {
				inherited.constructor.call(this);
				this._options = Objs.extend({
					combine_update_update: false,
					combine_insert_update: false,
					combine_insert_remove: false,
					combine_update_remove: false,
					source_id_key: sourceStore ? sourceStore.id_key() : "id",
					row_data: {},
					filter_data: {}
				}, options);
				this.historyStore = historyStore || this.auto_destroy(new MemoryStore());
				this.sourceStore = sourceStore;
				this.commitId = 1;
				if (sourceStore) {
					sourceStore.on("insert", this.sourceInsert, this);
					sourceStore.on("remove", this.sourceRemove, this);
					sourceStore.on("update", this.sourceUpdate, this);
				}
			},

			lockCommits: function () {
				this.lockedCommits = this.commitId;
			},

			unlockCommits: function () {
				delete this.lockedCommits;
			},

			sourceInsert: function (data) {
				return this.criticalSection("commit", function () {
					this.commitId++;
					return this.historyStore.insert(Objs.extend({
						row: data,
						type: "insert",
						row_id: data[this._options.source_id_key],
						commit_id: this.commitId
					}, this._options.row_data)).mapSuccess(function () {
						this.trigger("insert", this.commitId);
						return this.commitId;
					}, this);
				});
			},

			sourceUpdate: function (row, data, dummy_ctx, pre_data, transaction_id) {
				return this.criticalSection("commit", function () {
					this.commitId++;
					var row_id = Types.is_object(row) ? row[this._options.source_id_key] : row;
					var target_type = "update";
					var cont = Promise.create();
					if (this._options.combine_insert_update || this._options.combine_update_update) {
						var types = [];
						if (this._options.combine_insert_update)
							types.push({"type": "insert"});
						if (this._options.combine_update_update)
							types.push({"type": "update"});
						var combined_data = {};
						var delete_ids = [];
						var query = Objs.extend({ row_id: row_id }, this._options.filter_data);
						if (this.lockedCommits)
							query.commit_id = {"$gt": this.lockedCommits};
						if (types.length === 1)
							query = Objs.extend(query, types[0]);
						else
							query.$or = types;
						this.historyStore.query(query, {sort: {commit_id: 1}}).success(function (iter) {
							while (iter.hasNext()) {
								var itemData = iter.next();
								if (itemData.type === "insert")
									target_type = "insert";
								combined_data = Objs.extend(combined_data, itemData.row);
								delete_ids.push(this.historyStore.id_of(itemData));
							}
							iter.destroy();
							data = Objs.extend(combined_data, data);
							this.historyStore.removeAllByIds(delete_ids);
							cont.asyncSuccess(true);
						}, this);
					} else
						cont.asyncSuccess(true);
					return cont.mapSuccess(function () {
						return this.historyStore.insert(Objs.extend({
							row: data,
							pre_data: pre_data,
							type: target_type,
							row_id: row_id,
							commit_id: this.commitId,
							transaction_id: transaction_id
						}, this._options.row_data)).success(function () {
							this.trigger("update", this.commitId);
							this.trigger("update:" + row_id, this.commitId);
						}, this);
					}, this);
				});
			},

			sourceRemove: function (id, data) {
				return this.criticalSection("commit", function () {
					this.commitId++;
					var cont = Promise.create();
					if (this._options.combine_insert_remove) {
						this.historyStore.query(Objs.extend({
							type: "insert",
							row_id: id
						}, this._options.filter_data)).success(function (iter) {
							if (iter.hasNext()) {
								this.historyStore.removeAllByQuery(Objs.extend({
									row_id: id
								}, this._options.filter_data)).forwardCallback(cont);
							} else
								cont.asyncSuccess(true);
							iter.destroy();
						}, this);
					} else
						cont.asyncSuccess(true);
					if (this._options.combine_update_remove) {
						cont = cont.mapSuccess(function () {
							return this.historyStore.removeAllByQuery(Objs.extend({
								type: "update",
								row_id: id
							}, this._options.filter_data));
						}, this);
					}
					return cont.mapSuccess(function () {
						return this.historyStore.insert(Objs.extend({
							type: "remove",
							row_id: id,
							row: data,
							commit_id: this.commitId
						}, this._options.row_data)).success(function () {
							this.trigger("remove", this.commitId);
							this.trigger("remove:" + id, this.commitId);
						}, this);
					}, this);
				});
			},

			getCommitById: function (commitId) {
				return this.historyStore.query({
					commit_id: commitId
				}, {
					limit: 1
				}).mapSuccess(function (commits) {
					var result = commits.next();
					commits.destroy();
					return result;
				});
			},

			undoCommit: function (commit) {
				if (commit.type === "insert") {
					return this.sourceStore.remove(commit.row_id);
                } else if (commit.type === "remove") {
					return this.sourceStore.insert(commit.row);
				} else if (commit.type === "update") {
					return this.sourceStore.update(commit.row_id, commit.pre_data || {});
				}
			},

			undoCommitById: function (commitId) {
				return this.getCommitById(commitId).mapSuccess(function (commit) {
					return this.undoCommit(commit).success(function () {
						this.historyStore.remove(this.historyStore.id_of(commit));
					}, this);
				}, this);
			}

		};
	}]);
});

Scoped.define("module:Stores.WriteStoreMixin", [
	"module:Stores.StoreException",
	"base:Promise",
	"base:IdGenerators.TimedIdGenerator",
	"base:Objs",
	"base:Tokens"
], function (StoreException, Promise, TimedIdGenerator, Objs, Tokens) {
	return {

		_initializeWriteStore: function (options) {
			options = options || {};
			this._id_key = options.id_key || "id";
			this._create_ids = options.create_ids || false;
            this._validate_ids = options.validate_ids || false;
			this._id_lock = options.id_lock || false;
			this._useTransactionIds = options.use_transaction_ids || false;
			this.preserve_preupdate_data = options.preserve_preupdate_data || false;
			if (this._create_ids)
				this._id_generator = options.id_generator || this._auto_destroy(new TimedIdGenerator());
			if (this._validate_ids)
				this._id_validator = options.id_validator || this._id_generator;
			if (this._useTransactionIds)
				this.__transactionPrefix = Tokens.generate_token();
		},

		newTransactionId: function() {
			return this.__transactionPrefix + "-" + Tokens.generate_token();
		},

		isMyTransactionId: function(transactionId) {
			return transactionId && transactionId.indexOf(this.__transactionPrefix) === 0;
		},

		id_key: function () {
			return this._id_key;
		},

		id_of: function (row) {
			return row[this.id_key()];
		},
		
		id_row: function (id) {
			var result = {};
			result[this._id_key] = id;
			return result;
		},

		_inserted: function (row, ctx) {
			this.trigger("insert", row, ctx);		
			this.trigger("write", "insert", row, ctx);
		},

		_removed: function (id, ctx, data) {
			this.trigger("remove", id, ctx, data);
			this.trigger("write", "remove", id, ctx, data);
		},

		_updated: function (row, data, ctx, pre_data, transaction_id) {
			this.trigger("update", row, data, ctx, pre_data, transaction_id);
			this.trigger("write", "update", row, data, ctx, pre_data, transaction_id);
		}, 

		insert_all: function (data, ctx) {
			var promise = Promise.and();
			(data || []).forEach(function (item) {
                promise = promise.and(this.insert(item, ctx));
			}, this);
			return promise.end();
		},

		_insert: function (data, ctx) {
			return Promise.create(null, new StoreException("unsupported: insert"));
		},

		_remove: function (id, ctx) {
			return Promise.create(null, new StoreException("unsupported: remove"));
		},

		_update: function (id, data, ctx, transaction_id) {
			return Promise.create(null, new StoreException("unsupported: update"));
		},

		insert: function (data, ctx) {
			if (!data)
				return Promise.create(null, new StoreException("empty insert"));
            if (this._id_key in data && data[this._id_key] && this._id_lock)
            	return Promise.create(null, new StoreException("id lock"));
			if (this._create_ids && !(this._id_key in data && data[this._id_key]))
				data[this._id_key] = this._id_generator.generate(ctx);
			if (this._id_validator && this._id_key in data && data[this._id_key]) {
				if (!this._id_validator.valid(data[this._id_key], ctx))
	                return Promise.create(null, new StoreException("invalid id"));
			}
			return this._insert(data, ctx).success(function (row) {
				this._inserted(row, ctx);
			}, this);
		},

		remove: function (id, ctx) {
			return this._remove(id, ctx).success(function (data) {
				this._removed(id, ctx, data);
			}, this);
		},

		removeAllByIds: function (ids, ctx) {
			return Promise.and(ids.map(function (id) {
				return this.remove(id, ctx);
			}, this));
		},

		removeAllByQuery: function (query, options, ctx) {
			return this.query(query, options, ctx).mapSuccess(function (iter) {
				return this.removeAllByIds(iter.asArray().map(this.id_of, this));
			}, this);
		},

		update: function (id, data, ctx, transaction_id) {
			if (!transaction_id && this._useTransactionIds)
				transaction_id = this.newTransactionId();
			if (this.preserve_preupdate_data) {
                return this.get(id, ctx).mapSuccess(function (pre_data) {
                	var pre_data_filtered = {};
                	for (var key in data)
                        pre_data_filtered[key] = pre_data[key];
                	return this._update(id, data, ctx, transaction_id).success(function (row) {
                        this._updated(Objs.extend(Objs.objectBy(this._id_key, id), row), data, ctx, pre_data_filtered, transaction_id);
                    }, this);
                }, this);
			} else {
				return this._update(id, data, ctx, transaction_id).success(function (row) {
                    this._updated(Objs.extend(Objs.objectBy(this._id_key, id), row), data, ctx, undefined, transaction_id);
                }, this);
			}
		},
		
		unserialize: function (arr, ctx) {
			return this.insert_all(arr, ctx);
		}

	};
});


Scoped.define("module:Stores.WriteStore", [
                                           "base:Class",
                                           "base:Events.EventsMixin",
                                           "module:Stores.WriteStoreMixin"
                                           ], function (Class, EventsMixin, WriteStoreMixin, scoped) {
	return Class.extend({scoped: scoped}, [EventsMixin, WriteStoreMixin, function (inherited) {			
		return {

			constructor: function (options) {
				inherited.constructor.call(this);
				this._initializeWriteStore(options);
			},

			_ensure_index: function (key) {
			},

			ensure_index: function (key) {
				return this._ensure_index(key);
			}

		};
	}]);
});


Scoped.define("module:Stores.AsyncStore", [
                                                 "module:Stores.BaseStore",
                                                 "base:Promise",
                                                 "base:Async"
                                                 ], function (BaseStore, Promise, Async, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (store, options) {
				this.__store = store;
				options = options || {};
				options.id_key = store.id_key();
				inherited.constructor.call(this, options);
				this.__time = options.time || 0;
				if (options.destroy_store)
					this._auto_destroy(store);
			},

			_query_capabilities: function () {
				return this.__store._query_capabilities();
			},
			
			__async: function (f, args) {
				var promise = Promise.create();
				Async.eventually(function () {
					f.apply(this.__store, args).forwardCallback(promise);
				}, this, this.__time);
				return promise;
			},

			_insert: function () {
				return this.__async(this.__store.insert, arguments);
			},

			_remove: function () {
				return this.__async(this.__store.remove, arguments);
			},

			_get: function () {
				return this.__async(this.__store.get, arguments);
			},

			_update: function () {
				return this.__async(this.__store.update, arguments);
			},

			_query: function () {
				return this.__async(this.__store.query, arguments);
			},

			_ensure_index: function (key) {
				return this.__store.ensure_index(key);
			},

			_store: function () {
				return this.__store;
			}

		};
	});
});



Scoped.define("module:Stores.ConcatStore", [
    "module:Stores.BaseStore",
	"base:Promise",
	"base:Comparators",
	"base:Iterators.SkipIterator",
	"base:Iterators.LimitIterator",
	"base:Iterators.SortedOrIterator",
	"base:Iterators.ConcatIterator",
	"base:Iterators.ArrayIterator"
], function (BaseStore, Promise, Comparators, SkipIterator, LimitIterator, SortedOrIterator, ConcatIterator, ArrayIterator, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (primary, secondary, options) {
				this.__primary = primary;
				this.__secondary = secondary;
				inherited.constructor.call(this, options);
			},

			_query_capabilities: function () {
				return this._primary()._query_capabilities();
			},

            _count: function () {
				return this._primary().count.apply(this._primary(), arguments).and(this._secondary().count.apply(this._secondary(), arguments)).mapSuccess(function (counts) {
					return counts[0] + counts[1];
				});
            },

			_insert: function () {
				var args = arguments;
				return this._primary().insert.apply(this._primary(), args).mapError(function () {
					return this._secondary().insert.apply(this._secondary(), args);
				}, this);
			},

			_remove: function () {
                var args = arguments;
                return this._primary().remove.apply(this._primary(), args).mapError(function () {
                    return this._secondary().remove.apply(this._secondary(), args);
                }, this);
			},

			_get: function () {
                var args = arguments;
                return this._primary().get.apply(this._primary(), args).mapCallback(function (error, model) {
                    return model || this._secondary().get.apply(this._secondary(), args);
                }, this);
			},

			_update: function () {
                var args = arguments;
                return this._primary().update.apply(this._primary(), args).mapError(function () {
                    return this._secondary().update.apply(this._secondary(), args);
                }, this);
			},

			_query: function (q, c, ctx) {
				return this.cls.queryOnMultipleStores([this._primary(), this._secondary()], q, c, ctx);
			},

			_primary: function () {
				return this.__primary;
			},

            _secondary: function () {
                return this.__secondary;
            }

		};
	}, {

		queryOnMultipleStores: function (stores, query, options, ctx) {
			if (stores.length === 0)
				return [];
			if (stores.length === 1)
				return stores[0].query(query, options, ctx);
			options = options || {};
			var postLimit = options.limit;
			var postSkip = options.skip;
			if (options.skip) {
				delete options.skip;
				if (options.limit)
					options.limit += postSkip;
			}
			return Promise.and(stores.map(function (store) {
				return store.query(query, options, ctx);
			})).mapSuccess(function (iterators) {
				var iterator = options.sort ? new SortedOrIterator(iterators, Comparators.byObject(options.sort))
					         : new ConcatIterator(new ArrayIterator(iterators));
				if (postSkip)
					iterator = new SkipIterator(iterator, postSkip);
				if (postLimit)
					iterator = new LimitIterator(iterator, postLimit);
				return iterator;
			});
		}

	});
});


Scoped.define("module:Stores.ContextualizedStore", [
	"module:Stores.BaseStore",
	"base:Iterators.MappedIterator"
], function (BaseStore, MappedIterator, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (store, options) {
				this.__store = store;
				options = options || {};
				options.id_key = store.id_key();
				this.__context = options.context || this;
				this.__decode = options.decode;
				this.__encode = options.encode;
				inherited.constructor.call(this, options);
				if (options.destroy_store)
					this._auto_destroy(store);
			},
			
			_decode: function (data) {
				return this.__decode.call(this.__context, data);
			},
			
			_encode: function (data, ctx) {
				return this.__encode.call(this.__context, data, ctx);
			},
			
			_decodeId: function (id) {
				var result = this._decode(this.id_row(id));
				return {
					id: this.id_of(result.data),
					ctx: result.ctx
				};
			},

			_query_capabilities: function () {
				return this.__store._query_capabilities();
			},

			_insert: function (data) {
				var decoded = this._decode(data);
				return this.__store.insert(decoded.data, decoded.ctx).mapSuccess(function (data) {
					return this._encode(data, decoded.ctx);
				}, this);
			},

			_remove: function (id) {
				var decoded = this._decodeId(id);
				return this.__store.remove(decoded.id, decoded.ctx).mapSuccess(function () {
					return id;
				}, this);
			},

			_get: function (id) {
				var decoded = this._decodeId(id);
				return this.__store.get(decoded.id, decoded.ctx).mapSuccess(function (data) {
					return this._encode(data, decoded.ctx);
				}, this);
			},

			_update: function (id, data) {
				var decoded = this._decodeId(id);
				return this.__store.update(decoded.id, data, decoded.ctx).mapSuccess(function (row) {
					return row;
				}, this);
			},

			_query: function (query, options) {
				var decoded = this._decode(query);
				return this.__store.query(decoded.data, options, decoded.ctx).mapSuccess(function (results) {
					return (new MappedIterator(results, function (row) {
						return this._encode(row, decoded.ctx);
					}, this)).auto_destroy(results, true);
				}, this);
			},

			_ensure_index: function (key) {
				return this.__store.ensure_index(key);
			},

			_store: function () {
				return this.__store;
			}

		};
	});
});



Scoped.define("module:Stores.AbstractDecontextualizedStore", [
	"module:Stores.BaseStore",
	"base:Iterators.MappedIterator",
	"base:Promise"
], function (BaseStore, MappedIterator, Promise, scoped) {
   	return BaseStore.extend({scoped: scoped}, function (inherited) {			
   		return {

            constructor: function (store, options) {
                this.__store = store;
                options = options || {};
                options.id_key = store.id_key();
                inherited.constructor.call(this, options);
                if (options.destroy_store)
                    this._auto_destroy(store);
            },

            _query_capabilities: function () {
                return this.__store._query_capabilities();
            },

            _ensure_index: function (key) {
                return this.__store.ensure_index(key);
            },

            _store: function () {
                return this.__store;
            },

            _get: function (id, ctx) {
                return this._rawGet(id, ctx).mapSuccess(function (row) {
                    return this._decodeRow(row, ctx);
                }, this);
            },

			_rawQuery: function (query, options, ctx) {
                return this.__store.query(this._encodeQuery(query, ctx), options);
			},

			_rawGet: function (id, ctx) {
                return this._rawQuery(this.id_row(id), {limit: 1}, ctx).mapSuccess(function (rows) {
                    var result = rows.hasNext() ? rows.next() : null;
                    rows.destroy();
                    return result;
                }, this);
			},

            _query: function (query, options, ctx) {
                return this._rawQuery(query, options, ctx).mapSuccess(function (results) {
                    return (new MappedIterator(results, function (row) {
                        return this._decodeRow(row, ctx);
                    }, this)).auto_destroy(results, true);
                }, this);
            },

            _insert: function (data, ctx) {
                return Promise.value(this._encodeRow(data, ctx)).mapSuccess(function (encoded) {
                	return this.__store.insert(encoded).mapSuccess(function (data) {
                	    this._undecodedInserted(data, ctx);
                        return this._decodeRow(data, ctx);
                    }, this);
                }, this);
            },

            _undecodedInserted: function (data, ctx) {},

            _remove: function (id, ctx) {
            	return this._rawGet(id, ctx).mapSuccess(function (row) {
					if (!row)
						return true;
					var updatedData = this._encodeRemove(id, row, ctx);
					if (updatedData)
						return this.__store.update(id, updatedData);
					else
						return this.__store.remove(id);
                }, this);
            },

            _update: function (id, data, ctx, transaction_id) {
            	return this._rawGet(id, ctx).mapSuccess(function (row) {
            		if (!row)
            			return true;
            		return Promise.box(this._encodeUpdate, this, [id, data, ctx, row]).mapSuccess(function (updatedData) {
            		    return this.__store.update(id, updatedData).mapSuccess(function (updatedData) {
                            this._undecodedUpdated(id, updatedData, ctx, row, transaction_id);
                            return this._decodeRow(updatedData, ctx);
                        }, this);
                    }, this);
				}, this);
            },

            _undecodedUpdated: function (id, updatedData, ctx, row, transaction_id) {},

            _encodeRow: function (data, ctx) {
				throw "Abstract";
			},

			_encodeQuery: function (query, ctx) {
            	throw "Abstract";
			},

            _decodeRow: function (data, ctx) {
                throw "Abstract";
            },

			_encodeRemove: function (id, data, ctx) {
            	throw "Abstract";
			},

			_encodeUpdate: function (id, data, ctx, row) {
            	throw "Abstract";
			},

            _inserted: function (data, ctx) {
                inherited._inserted.call(this, this._decodeRow(data, ctx), ctx);
            },

            _removed: function (id, ctx, data) {
                inherited._removed.call(this, id, ctx, this._decodeRow(data, ctx));
            },

            _updated: function (row, data, ctx, pre_data, transaction_id) {
                inherited._updated.call(this, this._decodeRow(row, ctx), this._decodeRow(data, ctx), ctx, this._decodeRow(pre_data, ctx), transaction_id);
            }

        };
    });
});



Scoped.define("module:Stores.DecontextualizedSelectStore", [
    "module:Stores.AbstractDecontextualizedStore",
    "base:Objs"
], function (AbstractDecontextualizedStore, Objs, scoped) {
    return AbstractDecontextualizedStore.extend({scoped: scoped}, function (inherited) {
        return {

            _encodeRow: function (data, ctx) {
                return Objs.extend(Objs.clone(data, 1), ctx);
            },

            _encodeQuery: function (query, ctx) {
                return Objs.extend(Objs.clone(query, 1), ctx);
            },

            _decodeRow: function (data, ctx) {
                if (!data)
                    return data;
                data = Objs.clone(data, 1);
                Objs.iter(ctx, function (value, key) {
                    delete data[key];
                });
                return data;
            },

            _encodeRemove: function (id, data, ctx) {
                return false;
            },

            _encodeUpdate: function (id, data, ctx, row) {
                return this._encodeRow(data, ctx);
            }

        };
    });
});

Scoped.define("module:Stores.DecontextualizedMultiAccessStore", [
    "module:Stores.AbstractDecontextualizedStore",
    "base:Objs",
	"base:Promise",
    "base:Types"
], function (AbstractDecontextualizedStore, Objs, Promise, Types, scoped) {
    return AbstractDecontextualizedStore.extend({scoped: scoped}, function (inherited) {
        return {

            constructor: function (store, options) {
                inherited.constructor.call(this, store, options);
                this.__contextKey = options.contextKey;
                this.__subContext = options.subContext || "$eq";
                this.__newContextSupplements = options.newContextSupplements || {};
                this.__contextAttributes = options.contextAttributes || [];
                this.__contextAccessKey = options.contextAccessKey;
                this.__immediateRemove = options.immediateRemove;
                this.__keepContextAccessKey = options.keepContextAccessKey;
                this.__contextAccessExpander = options.contextAccessExpander || function () {
                    return [];
                };
                this.__contextDataCloner = options.contextDataCloner || function (data) {
                    var result = {};
                    this.__contextAttributes.forEach(function (ctxAttrKey) {
                        result[ctxAttrKey] = data[ctxAttrKey];
                    }, this);
                    return result;
                };
                this.__contextDataUpdater = options.contextDataUpdater;
            },

            _encodeQuery: function (query, ctx) {
                query = Objs.extend(Objs.objectBy(
                	this.__contextAccessKey,
					{"$elemMatch": Objs.objectBy(this.__subContext, ctx[this.__contextKey])}
				), query);
                this.__contextAttributes.forEach(function (key) {
                    // TODO: This currently only works with MongoDB databases
                    if (key in query) {
                        query[key + "." + ctx[this.__contextKey]] = query[key];
                        delete query[key];
                        // TODO: This is a weird workaround, otherwise the result will be empty
                        delete query[this.__contextAccessKey];
                    }
                }, this);
                return query;
            },

            _encodeRemove: function (id, data, ctx) {
                var ctxId = ctx[this.__contextKey];
                if (this.__immediateRemove) {
                    (data[this.__contextAccessKey]).forEach(function (cctx) {
                        if (cctx !== ctxId)
                            inherited._removed.call(this, id, cctx, data);
                    }, this);
                    return false;
                }
                var filtered = data[this.__contextAccessKey].filter(function (contextValue) {
                    if (this.__subContext !== "$eq")
                        contextValue = contextValue[this.__subContext];
                	return contextValue !== ctxId;
				}, this);
                if (filtered.length === 0)
                	return false;
                var updatedData = Objs.objectBy(this.__contextAccessKey, filtered);
                this.__contextAttributes.forEach(function (ctxAttrKey) {
                	updatedData[ctxAttrKey] = Objs.clone(data[ctxAttrKey], 1);
                	delete updatedData[ctxAttrKey][ctxId];
				}, this);
                return updatedData;
            },

            _decodeRow: function (data, ctx) {
                if (!data)
                    return data;
                data = Objs.clone(data, 2);
                var ctxId = ctx[this.__contextKey];
                if (!this.__keepContextAccessKey)
                    delete data[this.__contextAccessKey];
                this.__contextAttributes.forEach(function (ctxAttrKey) {
                    if (data[ctxAttrKey])
                        data[ctxAttrKey] = data[ctxAttrKey][ctxId];
                }, this);
                return data;
            },

            _encodeUpdate: function (id, data, ctx, row) {
                data = Objs.clone(data, 1);
                var ctxId = ctx[this.__contextKey];
                this.__contextAttributes.forEach(function (ctxAttrKey) {
                	if (ctxAttrKey in data) {
                        var value = data[ctxAttrKey];
                        data[ctxAttrKey] = row[ctxAttrKey];
                        data[ctxAttrKey][ctxId] = value;
                    }
                }, this);
                if (row && !data[this.__contextAccessKey])
                    data[this.__contextAccessKey] = row[this.__contextAccessKey];
                if (data[this.__contextAccessKey]) {
                    return this.__expandContextAccess(ctxId, data, ctx, row).mapSuccess(function (data) {
                        if (this.__contextDataUpdater)
                            data = this.__contextDataUpdater(id, data, ctx, row);
                        return data;
                    }, this);
                } else
                    return data;
            },

            _encodeRow: function (data, ctx) {
                var ctxId = ctx[this.__contextKey];
                data = Objs.clone(data, 1);
                var contextData = {};
                var newCtx = ctxId;
                if (this.__subContext !== "$eq")
                    newCtx = Objs.extend(this.__newContextSupplements, Objs.objectBy(this.__subContext, ctxId));
                //data[this.__contextAccessKey] = data[this.__contextAccessKey] && data[this.__contextAccessKey].length > 0 ? data[this.__contextAccessKey] : [newCtx];
                data[this.__contextAccessKey] = [newCtx].concat(data[this.__contextAccessKey] || []);
                this.__contextAttributes.forEach(function (ctxAttrKey) {
                    contextData[ctxAttrKey] = data[ctxAttrKey];
                    data[ctxAttrKey] = Objs.objectBy(
                        ctxId,
                        contextData[ctxAttrKey]
                    );
                }, this);
                return this.__expandContextAccess(ctxId, data, ctx);
            },

            __expandContextAccess: function (ctxId, data, ctx, row) {
                var otherContexts = Promise.value(this.__contextAccessExpander.call(this, data, ctx, row));
                return otherContexts.mapSuccess(function (otherContexts) {
                    otherContexts = otherContexts.filter(function (otherCtxId) {
                        return this.__subContext === "$eq" ? otherCtxId !== ctxId : otherCtxId[this.__subContext] !== ctxId;
                    }, this);
                    data[this.__contextAccessKey] = data[this.__contextAccessKey].concat(otherContexts);
                    var clonedDataPromises = otherContexts.map(function (otherCtxId) {
                        return Promise.value(this.__contextDataCloner.call(this, data, ctx, otherCtxId));
                    }, this);
                    return Promise.and(clonedDataPromises).mapSuccess(function (clonedDatas) {
                        otherContexts.forEach(function (otherCtxId, i) {
                            var otherData = clonedDatas[i];
                            this.__contextAttributes.forEach(function (ctxAttrKey) {
                                data[ctxAttrKey][this.__subContext === "$eq" ? otherCtxId : otherCtxId[this.__subContext]] = otherData[ctxAttrKey];
                            }, this);
                        }, this);
                        return data;
                    }, this);
                }, this);
            },

            _undecodedUpdated: function (id, updatedData, ctx, row, transaction_id) {
                (row[this.__contextAccessKey]).forEach(function (cctxId) {
                    if (ctx[this.__contextKey] === cctxId)
                        return;
                    var cctx = Objs.objectBy(this.__contextKey, cctxId);
                    this._updated(row, updatedData, cctx, row, transaction_id);
                }, this);
            },

            _undecodedInserted: function (data, ctx) {
                (data[this.__contextAccessKey]).forEach(function (cctxId) {
                    if (ctx[this.__contextKey] === cctxId)
                        return;
                    var cctx = Objs.objectBy(this.__contextKey, cctxId);
                    this._inserted(data, cctx);
                }, this);
            }

        };
    });
});


Scoped.define("module:Stores.KeyMapStore", ["module:Stores.TransformationStore", "base:Objs"], function (TransformationStore, Objs, scoped) {
	return TransformationStore.extend({scoped: scoped}, function (inherited) {			
		return {
			
			constructor: function (store, options, map) {
				inherited.constructor.call(this, store, options);
				this.__encodeMap = map;
				this.__decodeMap = Objs.inverseKeyValue(map);
			},
			
			__mapBy: function (data, map) {
				var result = {};
				Objs.iter(data, function (value, key) {
					result[map[key] || key] = value;
				});
				return result;
			},
			
			_encodeData: function (data) {
				return this.__mapBy(data, this.__encodeMap);
			},
			
			_decodeData: function (data) {
				return this.__mapBy(data, this.__decodeMap);
			}

		};
	});
});

Scoped.define("module:Stores.MultiplexerStore", [
                                                 "module:Stores.BaseStore",
                                                 "module:Queries.Constrained",
                                                 "base:Promise"
                                                 ], function (BaseStore, Constrained, Promise, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (options) {
				inherited.constructor.call(this, options);
				this.__context = options.context || this;
				this.__acquireStore = options.acquireStore;
				this.__releaseStore = options.releaseStore;
				this.__mapContext = options.mapContext;
			},
			
			_acquireStore: function (ctx) {
				return Promise.value(this.__acquireStore ? this.__acquireStore.call(this.__context, ctx) : ctx);
			},
			
			_releaseStore: function (ctx, store) {
				if (this.__releaseStore)
					this.__releaseStore.call(this.__context, ctx, store);
			},
			
			_mapContext: function (ctx) {
				return this.__mapContext ? this.__mapContext.call(this.__context, ctx) : null;
			},

			_query_capabilities: function () {
				return Constrained.fullConstrainedQueryCapabilities();
			},

			_insert: function (data, ctx) {
				return this._acquireStore(ctx).mapSuccess(function (store) {
					return store.insert(data, this._mapContext(ctx)).callback(function () {
						this._releaseStore(ctx, store);
					}, this);
				}, this);
			},
			
			_remove: function (id, ctx) {
				return this._acquireStore(ctx).mapSuccess(function (store) {
					return store.remove(id, this._mapContext(ctx)).callback(function () {
						this._releaseStore(ctx, store);
					}, this);
				}, this);
			},

			_update: function (id, data, ctx, transaction_id) {
				return this._acquireStore(ctx).mapSuccess(function (store) {
					return store.update(id, data, this._mapContext(ctx), transaction_id).callback(function () {
						this._releaseStore(ctx, store);
					}, this);
				}, this);
			},

			_get: function (id, ctx) {
				return this._acquireStore(ctx).mapSuccess(function (store) {
					return store.get(id, this._mapContext(ctx)).callback(function () {
						this._releaseStore(ctx, store);
					}, this);
				}, this);
			},
			
			_query: function (query, options, ctx) {
				return this._acquireStore(ctx).mapSuccess(function (store) {
					return store.query(query, options, this._mapContext(ctx)).callback(function () {
						this._releaseStore(ctx, store);
					}, this);
				}, this);
			}

		};
	});
});


Scoped.define("module:Stores.PassthroughStore", [
                                                 "module:Stores.BaseStore",
                                                 "base:Promise"
                                                 ], function (BaseStore, Promise, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (store, options) {
				this.__store = store;
				options = options || {};
				options.id_key = options.id_key || store.id_key();
				this.__preserves = options.preserves;
				inherited.constructor.call(this, options);
				if (options.destroy_store)
					this._auto_destroy(store);
				this.delegateEvents(["insert", "update", "remove"], this.__store);
			},

			_query_capabilities: function () {
				return this.__store._query_capabilities();
			},

			_insert: function (originalData, ctx) {
				return this._preInsert(originalData).mapSuccess(function (data) {
					return this.__store.insert(data, ctx).mapSuccess(function (data) {
						var result = this._postInsert(data);
						if (this.__preserves) {
							return result.mapSuccess(function (data) {
								this.__preserves.forEach(function (preserve) {
									if (preserve in originalData && !(preserve in data))
										data[preserve] = originalData[preserve];
								});
								return data;
							}, this);
						} else
							return result;
					}, this);
				}, this);
			},

			_remove: function (id, ctx) {
				return this._preRemove(id).mapSuccess(function (id) {
					return this.__store.remove(id, ctx).mapSuccess(function () {
						return this._postRemove(id);
					}, this);
				}, this);
			},

			_get: function (id, ctx) {
				return this._preGet(id).mapSuccess(function (id) {
					return this.__store.get(id, ctx).mapSuccess(function (data) {
						return this._postGet(data);
					}, this);
				}, this);
			},

			_update: function (id, data, ctx, transaction_id) {
				return this._preUpdate(id, data).mapSuccess(function (args) {
					return this.__store.update(args.id, args.data, ctx, transaction_id).mapSuccess(function (row) {
						return this._postUpdate(row);
					}, this);
				}, this);
			},

			_query: function (query, options, ctx) {
				return this._preQuery(query, options).mapSuccess(function (args) {
					return this.__store.query(args.query, args.options, ctx).mapSuccess(function (results) {
						return this._postQuery(results);
					}, this);
				}, this);
			},

			unserialize: function (data) {
				return this._preUnserialize(data).mapSuccess(function (data) {
					return this.__store.unserialize(data).mapSuccess(function (data) {
						return this._postUnserialize(data);
					}, this);
				}, this);
			},

			serialize: function (data) {
				return this._preSerialize(data).mapSuccess(function (data) {
					return this.__store.serialize(data).mapSuccess(function (data) {
						return this._postSerialize(data);
					}, this);
				}, this);
			},

			_ensure_index: function (key) {
				return this.__store.ensure_index(key);
			},

			_store: function () {
				return this.__store;
			},

			_preInsert: function (data) {
				return Promise.value(data);
			},
			
			_postInsert: function (data) {
				return Promise.value(data);
			},
			
			_preRemove: function (id) {
				return Promise.value(id);
			},
			
			_postRemove: function (id) {
				return Promise.value(true);
			},
			
			_preGet: function (id) {
				return Promise.value(id);
			},
			
			_postGet: function (data) {
				return Promise.value(data);
			},

			_preUpdate: function (id, data) {
				return Promise.value({id: id, data: data});
			},
			
			_postUpdate: function (row) {
				return Promise.value(row);
			},
			
			_preQuery: function (query, options) {
				return Promise.value({query: query, options: options});
			},
			
			_postQuery: function (results) {
				return Promise.value(results);
			},
			
			_preSerialize: function (data) {
				return Promise.value(data);
			},
			
			_postSerialize: function (data) {
				return Promise.value(data);
			},
			
			_preUnserialize: function (data) {
				return Promise.value(data);
			},
			
			_postUnserialize: function (data) {
				return Promise.value(data);
			},
			
			watcher: function () {
				return this.__store.watcher();
			}

		};
	});
});


Scoped.define("module:Stores.ReadyStore", [
                                               "module:Stores.PassthroughStore",
                                               "base:Promise",
                                               "base:Objs"
                                               ], function (PassthroughStore, Promise, Objs, scoped) {
	return PassthroughStore.extend({scoped: scoped}, function (inherited) {			
		return {
			
			__ready: false,
			
			ready: function () {
				this.__ready = true;
				Objs.iter(this.__promises, function (rec) {
					rec.promise.forwardCallback(rec.stalling);
				});
				delete this.__promises;
			},
			
			__execute: function (promise) {
				if (this.__ready)
					return promise;
				var stalling = Promise.create();
				this.__promises = this.__promises || [];
				this.__promises.push({
					stalling: stalling,
					promise: promise
				});
				return stalling;
			},

			_preInsert: function () {
				return this.__execute(inherited._preInsert.apply(this, arguments));
			},
			
			_preRemove: function () {
				return this.__execute(inherited._preRemove.apply(this, arguments));
			},
			
			_preGet: function () {
				return this.__execute(inherited._preGet.apply(this, arguments));
			},
			
			_preUpdate: function () {
				return this.__execute(inherited._preUpdate.apply(this, arguments));
			},
			
			_preQuery: function () {
				return this.__execute(inherited._preQuery.apply(this, arguments));
			},
			
			_preSerialize: function () {
				return this.__execute(inherited._preSerialize.apply(this, arguments));
			},
			
			_preUnserialize: function () {
				return this.__execute(inherited._preUnserialize.apply(this, arguments));
			}
			
		};
	});
});


Scoped.define("module:Stores.ResilientStore", [
                                                 "module:Stores.BaseStore",
                                                 "base:Promise"
                                                 ], function (BaseStore, Promise, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (store, options) {
				this.__store = store;
				options = options || {};
				options.id_key = store.id_key();
				inherited.constructor.call(this, options);
				this._resilience = options.resilience || 10;
				if (options.destroy_store)
					this._auto_destroy(store);
			},

			_query_capabilities: function () {
				return this.__store._query_capabilities();
			},

			_insert: function () {
				return Promise.resilientCall(this._store.insert, this._store, this._resilience, arguments);
			},

			_remove: function () {
				return Promise.resilientCall(this._store.remove, this._store, this._resilience, arguments);
			},

			_get: function () {
				return Promise.resilientCall(this._store.get, this._store, this._resilience, arguments);
			},

			_update: function (id, data) {
				return Promise.resilientCall(this._store.update, this._store, this._resilience, arguments);
			},

			_query: function (query, options) {
				return Promise.resilientCall(this._store.update, this._store, this._resilience, arguments);
			},

			_ensure_index: function (key) {
				return this.__store.ensure_index(key);
			},

			_store: function () {
				return this.__store;
			}

		};
	});
});


Scoped.define("module:Stores.ShardedStore", [
	"module:Stores.BaseStore",
	"module:Queries.Constrained",
	"module:Stores.ConcatStore"
], function (BaseStore, Constrained, ConcatStore, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (options) {
				inherited.constructor.call(this, options);
				this.__context = options.context || this;
				this.__shardSelector = options.shardSelector;
				this.__allShards = options.allShards;
				if (this.__allShards) {
					this.__allShards.forEach(function (shard) {
						this.delegateEvents(["insert", "update", "remove"], shard);
					}, this);
				}
			},
			
			_selectShards: function (data, ctx, countExpected) {
				var shards = this.__shardSelector.call(this.__context, data, ctx);
				if (countExpected !== undefined && shards.length !== countExpected)
					throw "Count of shards do not match.";
				return shards;
			},

			_selectSingleShard: function (data, ctx) {
				return (this._selectShards(data, ctx, 1))[0];
			},

			_selectShardById: function (id, ctx) {
				return this._selectSingleShard(this.id_row(id), ctx);
			},

			_query_capabilities: function () {
				return Constrained.fullConstrainedQueryCapabilities();
			},

			_insert: function (data, ctx) {
				return this._selectSingleShard(data, ctx).insert(data, ctx);
			},
			
			_remove: function (id, ctx) {
				return this._selectShardById(id, ctx).remove(id, ctx);
			},

			_get: function (id, ctx) {
				return this._selectShardById(id, ctx).get(id, ctx);
			},

			_update: function (id, data, ctx) {
				return this._selectShardById(id, ctx).update(id, data, ctx);
			},

			_query: function (query, options, ctx) {
				return ConcatStore.queryOnMultipleStores(this._selectShards(query, ctx), query, options, ctx);
			}

		};
	});
});

Scoped.define("module:Stores.SimulatorStore", [
                                               "module:Stores.PassthroughStore",
                                               "base:Promise"
                                               ], function (PassthroughStore, Promise, scoped) {
	return PassthroughStore.extend({scoped: scoped}, function (inherited) {			
		return {
			
			online: true,

			_preInsert: function () {
				return this.online ? inherited._preInsert.apply(this, arguments) : Promise.error("Offline");
			},
			
			_preRemove: function () {
				return this.online ? inherited._preRemove.apply(this, arguments) : Promise.error("Offline");
			},
			
			_preGet: function () {
				return this.online ? inherited._preGet.apply(this, arguments) : Promise.error("Offline");
			},
			
			_preUpdate: function () {
				return this.online ? inherited._preUpdate.apply(this, arguments) : Promise.error("Offline");
			},
			
			_preQuery: function () {
				return this.online ? inherited._preQuery.apply(this, arguments) : Promise.error("Offline");
			}
			
		};
	});
});


Scoped.define("module:Stores.TableStore", [
    "module:Stores.BaseStore",
    "base:Iterators.MappedIterator",
    "module:Queries.Constrained"
], function (BaseStore, MappedIterator, Constrained, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (table, options) {
				this.__table = table;
				options = options || {};
				options.id_key = table.primary_key();
				inherited.constructor.call(this, options);
				this.__options = {
					insertTags: options.insertTags || [],
					readTags: options.readTags || [],
					updateTags: options.updateTags || []
				};
			},

			_query_capabilities: function () {
				return Constrained.fullConstrainedQueryCapabilities();
			},

			_insert: function (data, ctx) {
				var model = this.__table.newModel({}, null, ctx);
				model.setByTags(data, this.__options.insertTags);
				return model.save().mapSuccess(function () {
                    var rec = model.asRecord(this.__options.readTags);
                    model.decreaseRef();
                    return rec;
				}, this);
			},

			_remove: function (id, ctx) {
				return this.__table.findById(id, ctx).mapSuccess(function (model) {
                    if (!model)
                        return model;
                    model.remove();
                    var rec = model.asRecord(this.__options.readTags);
                    model.decreaseRef();
                    return rec;
				}, this);
			},

			_get: function (id, ctx) {
				return this.__table.findById(id, ctx).mapSuccess(function (model) {
                    if (!model)
                        return model;
                    var rec = model.asRecord(this.__options.readTags);
                    model.decreaseRef();
                    return rec;
				}, this);
			},

			_update: function (id, data, ctx, transaction_id) {
				return this.__table.findById(id, ctx).mapSuccess(function (model) {
					if (!model)
						return model;
					model.setByTags(data, this.__options.updateTags);
					return model.save(transaction_id).mapSuccess(function () {
                        var rec = model.asRecord(this.__options.readTags);
                        model.decreaseRef();
                        return rec;
					}, this);
				}, this);
			},

			_query: function (query, options, ctx) {
				return this.__table.query(query, options, ctx).mapSuccess(function (models) {
					return (new MappedIterator(models, function (model) {
						var rec = model.asRecord(this.__options.readTags);
						model.decreaseRef();
						return rec;
					}, this)).auto_destroy(models, true);
				}, this);
			}

		};
	});
});



Scoped.define("module:Stores.TransformationStore", [
                                                 "module:Stores.PassthroughStore",
                                                 "module:Queries",
                                                 "base:Iterators.MappedIterator",
                                                 "base:Objs",
                                                 "base:Types",
                                                 "base:Promise"
                                                 ], function (PassthroughStore, Queries, MappedIterator, Objs, Types, Promise, scoped) {
	return PassthroughStore.extend({scoped: scoped}, function (inherited) {			
		return {
			
			_encodeData: function (data) {
				return data;
			},
			
			_decodeData: function (data) {
				return data;
			},
			
			_encodeSort: function (sort) {
				return this._encodeData(sort);
			},
			
			_encodeId: function (id) {
				return this._store().id_of(this._encodeData(Objs.objectBy(this.id_key(), id)));
			},
			
			_decodeId: function (id) {
				return this.id_of(this._decodeData(Objs.objectBy(this._store().id_key(), id)));
			},
			
			_encodeQuery: function (query, options) {
				var opts = Objs.clone(options);
				if (opts.sort)
					opts.sort = Types.is_object(opts.sort) ? this._encodeSort(opts.sort) : {};
				return {
					query: Queries.mapKeyValue(query, function (key, value) {
						return this._encodeData(Objs.objectBy(key, value)); 
					}, this),
					options: opts
				};
			},

			_preInsert: function (data) {
				return Promise.create(this._encodeData(data));
			},
			
			_postInsert: function (data) {
				return Promise.create(this._decodeData(data));
			},
			
			_preRemove: function (id) {
				return Promise.create(this._encodeId(id));
			},
			
			_postRemove: function (id) {
				return Promise.create(true);
			},
			
			_preGet: function (id) {
				return Promise.create(this._encodeId(id));
			},
			
			_postGet: function (data) {
				return Promise.create(this._decodeData(data));
			},

			_preUpdate: function (id, data) {
				return Promise.create({id: this._encodeId(id), data: this._encodeData(data)});
			},
			
			_postUpdate: function (row) {
				return Promise.create(this._decodeData(row));
			},
			
			_preQuery: function (query, options) {
				return Promise.create(this._encodeQuery(query, options));
			},
			
			_postQuery: function (results) {
				return Promise.create((new MappedIterator(results, function (data) {
					return this._decodeData(data);
				}, this)).auto_destroy(results, true));
			}

		};
	});
});

Scoped.define("module:Stores.AssocDumbStore", ["module:Stores.DumbStore"], function (DumbStore, scoped) {
	return DumbStore.extend({scoped: scoped}, {

		_read_key: function (key) {},
		_write_key: function (key, value) {},
		_remove_key: function (key) {},

		__read_id: function (key) {
			var raw = this._read_key(key);
			return raw ? parseInt(raw, 10) : null;
		},

		_read_last_id: function () {
			return this.__read_id("last_id");
		},

		_write_last_id: function (id) {
			this._write_key("last_id", id);
		},

		_remove_last_id: function () {
			this._remove_key("last_id");
		},

		_read_first_id: function () {
			return this.__read_id("first_id");
		},

		_write_first_id: function (id) {
			this._write_key("first_id", id);
		},

		_remove_first_id: function () {
			this._remove_key("first_id");
		},

		_read_item: function (id) {
			return this._read_key("item_" + id);
		},

		_write_item: function (id, data) {
			this._write_key("item_" + id, data);
		},

		_remove_item: function (id) {
			this._remove_key("item_" + id);
		},

		_read_next_id: function (id) {
			return this.__read_id("next_" + id);
		},

		_write_next_id: function (id, next_id) {
			this._write_key("next_" + id, next_id);
		},

		_remove_next_id: function (id) {
			this._remove_key("next_" + id);
		},

		_read_prev_id: function (id) {
			return this.__read_id("prev_" + id);
		},

		_write_prev_id: function (id, prev_id) {
			this._write_key("prev_" + id, prev_id);
		},

		_remove_prev_id: function (id) {
			this._remove_key("prev_" + id);
		}

	});
});

Scoped.define("module:Stores.DumbStore", [
                                          "module:Stores.BaseStore",
                                          "base:Promise",
                                          "base:Objs",
                                          "base:Iterators.Iterator"
                                          ], function (BaseStore, Promise, Objs, Iterator, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			_read_last_id: function () {},
			_write_last_id: function (id) {},
			_remove_last_id: function () {},
			_read_first_id: function () {},
			_write_first_id: function (id) {},
			_remove_first_id: function () {},
			_read_item: function (id) {},
			_write_item: function (id, data) {},
			_remove_item: function (id) {},
			_read_next_id: function (id) {},
			_write_next_id: function (id, next_id) {},
			_remove_next_id: function (id) {},
			_read_prev_id: function (id) {},
			_write_prev_id: function (id, prev_id) {},
			_remove_prev_id: function (id) {},

			constructor: function (options) {
				options = options || {};
				options.create_ids = true;
				inherited.constructor.call(this, options);
			},

			_insert: function (data) {
				return Promise.tryCatch(function () {
					var last_id = this._read_last_id();
					var id = data[this._id_key];
					if (last_id !== null) {
						this._write_next_id(last_id, id);
						this._write_prev_id(id, last_id);
					} else
						this._write_first_id(id);
					this._write_last_id(id);
					this._write_item(id, data);
					return data;
				}, this);
			},

			_remove: function (id) {
				return Promise.tryCatch(function () {
					var row = this._read_item(id);
					if (row) {
						this._remove_item(id);
						var next_id = this._read_next_id(id);
						var prev_id = this._read_prev_id(id);
						if (next_id !== null) {
							this._remove_next_id(id);
							if (prev_id !== null) {
								this._remove_prev_id(id);
								this._write_next_id(prev_id, next_id);
								this._write_prev_id(next_id, prev_id);
							} else {
								this._remove_prev_id(next_id);
								this._write_first_id(next_id);
							}
						} else if (prev_id !== null) {
							this._remove_next_id(prev_id);
							this._write_last_id(prev_id);
						} else {
							this._remove_first_id();
							this._remove_last_id();
						}
					}
					return row;
				}, this);
			},

			_get: function (id) {
				return Promise.tryCatch(function () {
					return this._read_item(id);
				}, this);
			},

			_update: function (id, data) {
				return Promise.tryCatch(function () {
					var row = this._get(id);
					if (row) {
						delete data[this._id_key];
						Objs.extend(row, data);
						this._write_item(id, row);
					}
					return row;
				}, this);
			},

			_query: function (query, options) {
				return Promise.tryCatch(function () {
					var iter = new Iterator();
					var store = this;
					var fid = this._read_first_id();
					Objs.extend(iter, {
						__id: fid === null ? 1 : fid,
								__store: store,
								__query: query,

								hasNext: function () {
									var last_id = this.__store._read_last_id();
									if (last_id === null)
										return false;
									while (this.__id < last_id && !this.__store._read_item(this.__id))
										this.__id++;
									return this.__id <= last_id;
								},

								next: function () {
									if (this.hasNext()) {
										var item = this.__store.get(this.__id);
										if (this.__id == this.__store._read_last_id())
											this.__id++;
										else
											this.__id = this.__store._read_next_id(this.__id);
										return item;
									}
									return null;
								}
					});
					return iter;
				}, this);
			}	

		};
	});
});

//Stores everything permanently in the browser's local storage

Scoped.define("module:Stores.LocalStore", ["module:Stores.AssocDumbStore"], function (AssocDumbStore, scoped) {
	return AssocDumbStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (options) {
				inherited.constructor.call(this, options);
				this.__prefix = options.prefix;
				this.__localStorage = Scoped.getGlobal("localStorage");
			},

			__key: function (key) {
				return this.__prefix + key;
			},

			_read_key: function (key) {
				try {
					return JSON.parse(this.__localStorage.getItem(this.__key(key)));
				} catch (e) {
					return null;
				}
			},

			_write_key: function (key, value) {
				this.__localStorage.setItem(this.__key(key), JSON.stringify(value));
			},

			_remove_key: function (key) {
				this.__localStorage.removeItem(this.__key(key));
			}

		};
	});
});

Scoped.define("module:Stores.Invokers.RestInvokeeAjaxInvoker", [
    "base:Class",
    "base:Net.Uri",
    "base:Net.HttpHeader",
    "module:Stores.Invokers.RestInvokee"
], function (Class, Uri, HttpHeader, Invokee, scoped) {
	return Class.extend({scoped: scoped}, [Invokee, function (inherited) {
		return {
			
			constructor: function (ajax) {
				inherited.constructor.call(this);
				this.__ajax = ajax;
			},
			
			restInvoke: function (method, uri, post, get) {
				return this.__ajax.execute({
					method: method,
					data: post,
					uri: Uri.appendUriParams(uri, get)
				}).mapError(function (error) {
					return {
						error: error.status_code(),
						data: error.data ? error.data() : null,
						invalid: error.status_code() === HttpHeader.HTTP_STATUS_PRECONDITION_FAILED
					};
				}, this);
			}			
			
		};
	}]);
});
Scoped.define("module:Stores.Invokers.StoreInvokee", [], function () {
	return {
		storeInvoke: function (member, data, context) {},
        storeInvokeWatcher: function (member, data, context) {}
	};
});


Scoped.define("module:Stores.Invokers.RestInvokee", [], function () {
	return {
		restInvoke: function (method, uri, post, get, ctx) {}
	};
});


Scoped.define("module:Stores.Invokers.RouteredRestInvokee", [], function () {
	return {
		routeredRestInvoke: function (member, uriData, post, get, ctx) {}
	};
});



Scoped.define("module:Stores.Invokers.AbstractInvokerStore", [
    "module:Stores.BaseStore",
    "module:Queries.Constrained"
], function (BaseStore, Constrained, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {
			
			_query_capabilities: function () {
				return Constrained.fullConstrainedQueryCapabilities();
			},
			
			_invoke: function (member, data, context) {
				throw "Abstract method invoke";
			},

            _invokeWatcher: function (member, data, context) {
                throw "Abstract method invokeWatcher";
			},

			_insert: function (data, ctx) {
				return this._invoke("insert", data, ctx);
			},

			_remove: function (id, ctx) {
				return this._invoke("remove", id, ctx);
			},

			_get: function (id, ctx) {
				return this._invoke("get", id, ctx);
			},

			_update: function (id, data, ctx, transaction_id) {
				return this._invoke("update", {
					id: id,
					data: data,
					transaction_id: transaction_id
				}, ctx);
			},

			_query: function (query, options, ctx) {
				return this._invoke("query", {
					query: query,
					options: options
				}, ctx);
			}

		};
	});
});


Scoped.define("module:Stores.Invokers.InvokerStoreWatcher", [
    "module:Stores.Watchers.LocalWatcher"
], function (LocalWatcher, scoped) {
	return LocalWatcher.extend({scoped: scoped}, {

        _watchItem : function(id) {
            this._store._invokeWatcher("watchItem", id);
		},

        _unwatchItem : function(id) {
            this._store._invokeWatcher("unwatchItem", id);
		},

        _watchInsert : function(query) {
            this._store._invokeWatcher("watchInsert", query);
		},

        _unwatchInsert : function(query) {
            this._store._invokeWatcher("unwatchInsert", query);
		}

	});
});



Scoped.define("module:Stores.Invokers.InvokerStore", [
    "module:Stores.Invokers.AbstractInvokerStore"
], function (AbstractInvokerStore, scoped) {
    return AbstractInvokerStore.extend({scoped: scoped}, function (inherited) {
        return {

            constructor: function (storeInvokee, options) {
                inherited.constructor.call(this, options);
                this.__storeInvokee = storeInvokee;
            },

            _invoke: function (member, data, context) {
                return this.__storeInvokee.storeInvoke(member, data, context);
            }

        };
    });
});





Scoped.define("module:Stores.Invokers.StoreInvokeeInvoker", [
	"base:Class",
	"module:Stores.Invokers.StoreInvokee"
], function (Class, Invokee, scoped) {
	return Class.extend({scoped: scoped}, [Invokee, function (inherited) {		
		return {
					
			constructor: function (store) {
				inherited.constructor.apply(this);
				this.__store = store;
			},

			_store: function () {
				return this.__store;
			},
			
			storeInvoke: function (member, data, context) {
				return this["__" + member](data, context);
			},

            storeInvokeWatcher: function (member, data, context) {
                this["__" + member](data, context);
                return true;
			},

			__insert: function (data, context) {
				return this._store().insert(data, context);
			},
		
			__remove: function (id, context) {
				return this._store().remove(id, context);
			},

			__get: function (id, context) {
				return this._store().get(id, context);
			},

			__update: function (data, context) {
				return this._store().update(data.id, data.data, context, data.transaction_id);
			},

			__query: function (data, context) {
				return this._store().query(data.query, data.options, context).mapSuccess(function (iter) {
					var result = iter.asArray();
					iter.decreaseRef();
					return result;
				});
			},

            __watchItem: function (id, ctx) {
                if (this._store().watcher())
                    this._store().watcher().watchItem(id, ctx);
            },

            __unwatchItem: function (id, ctx) {
                if (this._store().watcher())
                    this._store().watcher().unwatchItem(id, ctx);
            },

            __watchInsert: function (query, ctx) {
                if (this._store().watcher())
                    this._store().watcher().watchInsert(query, ctx);
            },

            __unwatchInsert: function (query, ctx) {
                if (this._store().watcher())
                    this._store().watcher().unwatchInsert(query, ctx);
            }

		};
	}]);
});
Scoped.define("module:Stores.Invokers.StoreInvokeeRestInvoker", [
    "base:Class",
    "base:Objs",
    "base:Types",
    "module:Stores.Invokers.StoreInvokee"
], function (Class, Objs, Types, Invokee, scoped) {
	return Class.extend({scoped: scoped}, [Invokee, function (inherited) {
		return {
			
			constructor: function (restInvokee, options) {
				inherited.constructor.call(this);
				this.__restInvokee = restInvokee;
				this.__options = Objs.tree_extend({
					methodMap: {
						"insert": "POST",
						"get": "GET",
						"remove": "DELETE",
						"update": "PUT",
						"query": "GET" 
					},
					toMethod: null,
					dataMap: {
						"insert": function (data, context) { return data; },
						"update": function (data, context) { return data.data; }
					},
					toData: null,
					getMap: {
						"query": function (data, context) {
							var result = {};
							if (data.query && !Types.is_empty(data.query))
								result.query = JSON.stringify(data.query);
							result = Objs.extend(result, data.options);
							if (result.sort)
								result.sort = JSON.stringify(result.sort);
							return result;
						},
						"update": function (data, context) {
							var result = {};
							if (data.transaction_id)
								result.transactionid = data.transaction_id;
							return result;
						}
					},
					toGet: null,
					baseURI: "/",
					uriMap: {
						"get": function (id, context) { return id; },
						"remove": function (id, context) { return id; },
						"update": function (data, context) { return data.id; }
					},
					toURI: null,
					context: this
				}, options);
			},
			
			storeInvoke: function (member, data, context) {
				return this.__restInvokee.restInvoke(
					this._toMethod(member, data, context),
					this._toURI(member, data, context),
					this._toData(member, data, context),
					this._toGet(member, data, context)
				);
			},
			
			_toMethod: function (member, data, context) {
				var method = null;
				if (this.__options.toMethod)
					method = this.__options.toMethod.call(this.__options.context, member, data, context);
				return method || this.__options.methodMap[member];
			},
			
			_toURI: function (member, data, context) {
				var base = Types.is_function(this.__options.baseURI) ? this.__options.baseURI.call(this.__options.context, context) : this.__options.baseURI;
				if (this.__options.toURI) {
					var ret = this.__options.toURI.call(this.__options.context, member, data, context);
					if (ret)
						return base + ret;
				}
				return base + (member in this.__options.uriMap ? (Types.is_function(this.__options.uriMap[member]) ? this.__options.uriMap[member].call(this.__options.context, data, context): this.__options.uriMap[member]) : "");
			},
			
			_toData: function (member, data, context) {
				var result = null;
				if (this.__options.toData)
					result = this.__options.toData.call(this.__options.context, member, data, context);
				return result || (member in this.__options.dataMap ? this.__options.dataMap[member].call(this.__options.context, data, context) : null);
			},
			
			_toGet: function (member, data, context) {
				var result = null;
				if (this.__options.toGet)
					result = this.__options.toGet.call(this.__options.context, member, data, context);
				return result || (member in this.__options.getMap ? this.__options.getMap[member].call(this.__options.context, data, context) : null);
			}
			
			
		};
	}]);
});


Scoped.define("module:Stores.Invokers.RouteredRestInvokeeStoreInvoker", [
     "base:Class",
     "base:Objs",
     "base:Types",
     "module:Stores.Invokers.RouteredRestInvokee"
 ], function (Class, Objs, Types, Invokee, scoped) {
 	return Class.extend({scoped: scoped}, [Invokee, function (inherited) {
 		return {

			constructor: function (storeInvokee, options) {
				inherited.constructor.call(this);
				this.__storeInvokee = storeInvokee;
				this.__options = Objs.tree_extend({
					dataMap: {
						"insert": function (member, uriData, post, get, ctx) {
							return post;
						},
						"update": function (member, uriData, post, get, ctx) {
							return {
								id: uriData.id,
								data: post,
								transaction_id: get.transactionid
							};
						},
						"get": function (member, uriData, post, get, ctx) {
							return uriData.id;
						},
						"remove": function (member, uriData, post, get, ctx) {
							return uriData.id;
						},
						"query": function (member, uriData, post, get, ctx) {
							var result = {};
							try {
								if (get.query)
									result.query = JSON.parse(get.query);
							} catch (e) {}
							var opts = Objs.clone(get, 1);
							delete opts.query;
							if (!Types.is_empty(opts))
								result.options = opts;
							try {
								if (result.options.sort)
									result.options.sort = JSON.parse(result.options.sort);
							} catch (e) {}
							return result;
						}
					},
					toData: null,
					contextMap: {},
					toContext: function (member, uriData, post, get, ctx) {
						return ctx;
					},
					context: this
				}, options);
			},
			
			routeredRestInvoke: function (member, uriData, post, get, ctx) {
				return this.__storeInvokee.storeInvoke(
					member,
					this._toData(member, uriData, post, get, ctx),
					this._toContext(member, uriData, post, get, ctx)
				);
 			},
 			
 			_toData: function (member, uriData, post, get, ctx) {
				var data = null;
				if (this.__options.toData)
					data = this.__options.toData.call(this.__options.context, member, uriData, post, get, ctx);
				return data || (member in this.__options.dataMap ? this.__options.dataMap[member].call(this.__options.context, member, uriData, post, get, ctx) : null);
 			},
 			
 			_toContext: function (member, uriData, post, get, ctx) {
				var data = null;
				if (this.__options.toContext)
					data = this.__options.toContext.call(this.__options.context, member, uriData, post, get, ctx);
				return data || (member in this.__options.contextMap ? this.__options.contextMap[member].call(this.__options.context, member, uriData, post, get, ctx) : null);
 			}
 		
		};
	}]);
});


Scoped.define("module:Stores.Invokers.RestInvokeeStoreInvoker", [
     "module:Stores.Invokers.RouteredRestInvokeeStoreInvoker",
     "module:Stores.Invokers.RestInvokee",
     "base:Router.RouteParser",
     "base:Objs",
     "base:Types"
 ], function (Class, Invokee, RouteParser, Objs, Types, scoped) {
 	return Class.extend({scoped: scoped}, [Invokee, function (inherited) {
 		return {
 			
			constructor: function (storeInvokee, options) {
				inherited.constructor.call(this, storeInvokee, Objs.tree_extend({
					baseURI: "/",
					methodMap: {
						"insert": "POST",
						"get": "GET",
						"remove": "DELETE",
						"update": "PUT",
						"query": "GET" 
					},
					toMethod: null,
					uriMap: {
						"get": "(id:.+)",
						"remove": "(id:.+)",
						"update": "(id:.+)"
					},
					toURI: null
				}, options));
				this.__routes = {};
				Objs.iter(this.__options.methodMap, function (method, member) {
					var s = "";
					var base = Types.is_function(this.__options.baseURI) ? this.__options.baseURI.call(this.__options.context) : this.__options.baseURI;
					if (this.__options.toURI) {
						var ret = this.__options.toURI.call(this.__options.context, member);
						if (ret)
							s = base + ret;
					}
					if (!s)
						s = base + (member in this.__options.uriMap ? (Types.is_function(this.__options.uriMap[member]) ? this.__options.uriMap[member].call(this.__options.context): this.__options.uriMap[member]) : "");
					this.__routes[member] = method + " " + s;
				}, this);
				this.__routeParser = this.auto_destroy(new RouteParser(this.__routes));
			},
			
 			restInvoke: function (method, uri, post, get, ctx) {
 				var routed = this.__routeParser.parse(method + " " + uri);
 				return this.routeredRestInvoke(routed.name, routed.args, post, get, ctx);
 			}
			
		};
	}]);
});

/*
 * Very important to know:
 *  - If both itemCache + remoteStore use the same id_key, the keys actually coincide.
 *  - If they use different keys, the cache stores the remoteStore keys as a foreign key and assigns its own keys to the cached items
 *
 */

Scoped.define("module:Stores.CachedStore", [
	"module:Stores.BaseStore",
	"module:Stores.MemoryStore",
	"module:Queries",
	"module:Queries.Constrained",
	"module:Stores.CacheStrategies.ExpiryCacheStrategy",
	"base:Promise",
	"base:Objs",
	"base:Types",
	"base:Iterators.ArrayIterator",
	"base:Iterators.MappedIterator",
	"base:Timers.Timer"
], function (Store, MemoryStore, Queries, Constrained, ExpiryCacheStrategy, Promise, Objs, Types, ArrayIterator, MappedIterator, Timer, scoped) {
	return Store.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (remoteStore, options) {
				inherited.constructor.call(this);
				this.remoteStore = remoteStore;
				this.__remoteQueryAggregate = Promise.aggregateExecution(this.remoteStore.query, this.remoteStore, null, function (data) {
					return data ? data.asArray() : data;
				});
				this._options = Objs.extend({
					itemMetaKey: "meta",
					queryMetaKey: "meta",
					queryKey: "query",
					cacheKey: null,
					suppAttrs: {},
					optimisticRead: false,
					hideMetaData: true
				}, options);
				this._online = true;
				this.itemCache = this._options.itemCache || this.auto_destroy(new MemoryStore({
					id_key: this._options.cacheKey || this.remoteStore.id_key()
				}));
				this._options.cacheKey = this.itemCache.id_key();
				this._id_key = this.itemCache.id_key();
				this._foreignKey = this.itemCache.id_key() !== this.remoteStore.id_key();
				this.queryCache = this._options.queryCache || this.auto_destroy(new MemoryStore());
				this.cacheStrategy = this._options.cacheStrategy || this.auto_destroy(new ExpiryCacheStrategy());
				if (this._options.auto_cleanup) {
					this.auto_destroy(new Timer({
						fire: this.cleanup,
						context: this,
						start: true,
						delay: this._options.auto_cleanup
					}));
				}
			},

			_query_capabilities: function () {
				return Constrained.fullConstrainedQueryCapabilities();
			},

			_insert: function (data, ctx) {
				return this.cacheInsert(data, {
					lockItem: true,
					silent: true,
					refreshMeta: false,
					accessMeta: true
				}, ctx);
			},

			_update: function (id, data, ctx, transaction_id) {
				return this.cacheUpdate(id, data, {
					ignoreLock: false,
					silent: true,
					lockAttrs: true,
					refreshMeta: false,
					accessMeta: true
				}, ctx, transaction_id);
			},

			_remove: function (id, ctx) {
				return this.cacheRemove(id, {
					ignoreLock: true,
					silent: true
				}, ctx);
			},

			_get: function (id, ctx) {
				return this.cacheGet(id, {
					silentInsert: true,
					silentUpdate: true,
					silentRemove: true,
					refreshMeta: true,
					accessMeta: true
				}, ctx);
			},

			_query: function (query, options, ctx) {
				return this.cacheQuery(query, options, {
					silent: true,
					queryRefreshMeta: true,
					queryAccessMeta: true,
					refreshMeta: true,
					accessMeta: true
				}, ctx);
			},

			/*
			 * options:
			 *   - lockItem: boolean
			 *   - silent: boolean
			 *   - refreshMeta: boolean
			 *   - accessMeta: boolean
			 */

			cacheInsert: function (data, options, ctx) {
				var meta = {
					lockedItem: options.lockItem,
					lockedAttrs: {},
					refreshMeta: options.refreshMeta ? this.cacheStrategy.itemRefreshMeta() : null,
					accessMeta: options.accessMeta ? this.cacheStrategy.itemAccessMeta() : null
				};
				if (options.meta)
					meta = Objs.extend(meta, options.meta);
				return this.itemCache.insert(this.addItemSupp(this.addItemMeta(data, meta)), ctx).mapSuccess(function (result) {
					data = this._options.hideMetaData ? this.removeItemMeta(result) : result;
					if (!options.silent)
						this._inserted(data, ctx);
					return data;
				}, this);
			},

			/*
			 * options:
			 *   - ignoreLock: boolean
			 *   - lockAttrs: boolean
			 *   - silent: boolean
			 *   - accessMeta: boolean
			 *   - refreshMeta: boolean
			 *   - foreignKey: boolean (default false)
			 *   - unlockItem: boolean (default false)
			 */

			cacheUpdate: function (id, data, options, ctx, transaction_id) {
				var foreignKey = options.foreignKey && this._foreignKey;
				var idKey = foreignKey ? this.remoteStore.id_key() : this.id_key();
				var itemPromise = foreignKey ?
					              this.itemCache.getBy(this.remoteStore.id_key(), id, ctx)
					            : this.itemCache.get(id, ctx);
				return itemPromise.mapSuccess(function (item) {
					if (!item)
						return null;
					var meta = this.readItemMeta(item);
					if (options.unlockItem) {
						meta.lockedItem = false;
						meta.lockedAttrs = {};
					}
					if (options.meta)
						meta = Objs.extend(Objs.clone(meta, 1), options.meta);
					data = Objs.filter(data, function (value, key) {
						return (options.ignoreLock || (!meta.lockedItem && !meta.lockedAttrs[key])) && (!(key in item) || item[key] != value);
					}, this);
					/*
					if (Types.is_empty(data))
						return this.removeItemMeta(item);
					*/
					if (options.lockAttrs) {
						Objs.iter(data, function (value, key) {
							meta.lockedAttrs[key] = true;
						}, this);
					}
					if (options.refreshMeta)
						meta.refreshMeta = this.cacheStrategy.itemRefreshMeta(/*meta.refreshMeta*/);
					if (options.accessMeta)
						meta.accessMeta = this.cacheStrategy.itemAccessMeta(meta.accessMeta);
					return this.itemCache.update(this.itemCache.id_of(item), this.addItemMeta(data, meta), ctx, transaction_id).mapSuccess(function (result) {
						result = this._options.hideMetaData ? this.removeItemMeta(result) : result;
						if (!result[idKey])
							result[idKey] = id;
						if (!options.silent)
							this._updated(result, data, ctx, undefined, transaction_id);
						else if (options.meta)
							this._updated(result, this.addItemMeta({}, meta), ctx, undefined, transaction_id);
						return result;
					}, this);
				}, this);
			},

			cacheInsertUpdate: function (data, options, ctx, transaction_id) {
				var foreignKey = options.foreignKey && this._foreignKey;
				var itemPromise = foreignKey ?
					              this.itemCache.getBy(this.remoteStore.id_key(), this.remoteStore.id_of(data), ctx)
					            : this.itemCache.get(this.itemCache.id_of(data), ctx);
				return itemPromise.mapSuccess(function (item) {
					options.foreignKey = false;
					if (!item)
                        return this.cacheInsert(data, options, ctx);
					if (options.keepCache)
						return item;
					var backup = Objs.clone(data, 1);
					var itemId = this.itemCache.id_of(item);
					backup[this.itemCache.id_key()] = itemId;
					return this.cacheUpdate(itemId, data, options, ctx, transaction_id).mapSuccess(function (result) {
						return Objs.extend(backup, result);
					});
				}, this);
			},

			/*
			 * options:
			 *   - ignoreLock: boolean
			 *   - silent: boolean
			 *   - foreignKey: boolean
			 */
			cacheRemove: function (id, options, ctx) {
				var foreignKey = options.foreignKey && this._foreignKey;
				var itemPromise = foreignKey ?
					  this.itemCache.getBy(this.remoteStore.id_key(), id, ctx)
					: this.itemCache.get(id, ctx);
				return itemPromise.mapSuccess(function (data) {
					if (!data)
						return data;
					var meta = this.readItemMeta(data);
					if (!options.ignoreLock && (meta.lockedItem || !Types.is_empty(meta.lockedAttrs)))
						return Promise.error("locked item");
					var cached_id = this.itemCache.id_of(data);
					return this.itemCache.remove(cached_id, ctx).mapSuccess(function () {
						if (!options.silent)
							this._removed(cached_id, ctx, data);
						return data;
					}, this);
				}, this);
			},
			
			cacheOnlyGet: function (id, options, ctx) {
				options = options || {};
				var foreignKey = options.foreignKey && this._foreignKey;
				var itemPromise = foreignKey ?
					  this.itemCache.getBy(this.remoteStore.id_key(), id, ctx)
					: this.itemCache.get(id, ctx);
				return itemPromise;
			},

			/*
			 * options:
			 *   - silentInsert: boolean
			 *   - silentUpdate: boolean
			 *   - silentRemove: boolean
			 *   - refreshMeta: boolean
			 *   - accessMeta: boolean
			 *   - foreignKey: boolean
			 */
			cacheGet: function (id, options, ctx) {
				var foreignKey = options.foreignKey && this._foreignKey;
				return this.cacheOnlyGet(id, options, ctx).mapSuccess(function (data) {
					if (!data) {
						if (!foreignKey && this._foreignKey)
							return data;
						return this.remoteStore.get(id, ctx).mapSuccess(function (data) {
							this.online();
							if (data) {
								return this.cacheInsert(data, {
									lockItem: false,
									silent: options.silentInsert,
									accessMeta: true,
									refreshMeta: true
								}, ctx);
							} else
								return data;
						}, this);
					}
					var meta = this.readItemMeta(data);
					var cached_id = this.itemCache.id_of(data);
					var remote_id = this.remoteStore.id_of(data);
					if (this.cacheStrategy.validItemRefreshMeta(meta.refreshMeta) || meta.lockedItem) {
						if (options.accessMeta) {
							meta.accessMeta = this.cacheStrategy.itemAccessMeta(meta.accessMeta);
							this.itemCache.update(cached_id, this.addItemMeta({}, meta), ctx);
						}
						return this._options.hideMetaData ? this.removeItemMeta(data) : data;
					}
					return this.remoteStore.get(remote_id, ctx).mapSuccess(function (data) {
						this.online();
						if (data) {
							return this.cacheUpdate(cached_id, data, {
								ignoreLock: false,
								lockAttrs: false,
								silent: options.silentUpdate,
								accessMeta: true,
								refreshMeta: true
							}, ctx).mapSuccess(function (cacheResult) {
								data[this.itemCache.id_key()] = cached_id;
								return Objs.extend(data, cacheResult);
							}, this);
						} else {
							return this.cacheRemove(cached_id, {
								ignoreLock: false,
								silent: options.silentRemove
							}, ctx);
						}
					}, this).mapError(function () {
						this.offline();
						return Promise.value(data);
					}, this);
				}, this);
			},
			
			__itemCacheQuery: function (query, options, ctx) {
				return this.itemCache.query(query, options, ctx).mapSuccess(function (items) {
					items = items.asArray();
					Objs.iter(items, function (item) {
						this.cacheUpdate(this.itemCache.id_of(item), {}, {
							lockItem: false,
							lockAttrs: false,
							silent: true,
							accessMeta: options.accessMeta,
							refreshMeta: false
						}, ctx);
					}, this);
					var arrIter = new ArrayIterator(items);
					return this._options.hideMetaData ? (new MappedIterator(arrIter, this.removeItemMeta, this)).auto_destroy(arrIter, true) : arrIter;
				}, this);
			},

			/*
			 * options:
			 *   - silent: boolean
			 *   - queryRefreshMeta: boolean
			 *   - queryAccessMeta: boolean
			 *   - refreshMeta: boolean
			 *   - accessMeta: boolean
			 */
			cacheQuery: function (query, queryOptions, options, ctx) {
				var queryString = Constrained.serialize({
					query: query,
					options: queryOptions
				});
				var localQuery = Objs.objectBy(
					this._options.queryKey,
					queryString
				);
				return this.queryCache.query(localQuery, {limit : 1}, ctx).mapSuccess(function (resultIter) {
					var result = resultIter.hasNext() ? resultIter.next() : null;
					resultIter.destroy();
					if (result) {
						var meta = this.readQueryMeta(result);
						var query_id = this.queryCache.id_of(result);
						if (this.cacheStrategy.validQueryRefreshMeta(meta.refreshMeta)) {
							if (options.queryAccessMeta) {
								meta.accessMeta = this.cacheStrategy.queryAccessMeta(meta.accessMeta);
								this.queryCache.update(query_id, this.addQueryMeta({}, meta), ctx);
							}
							return this.__itemCacheQuery(query, queryOptions, ctx);
						}
						this.queryCache.remove(query_id, ctx);
					}
					// Note: This is probably not good enough in the most general cases.
					if (Queries.queryDeterminedByAttrs(query, this._options.suppAttrs, true))
						return this.itemCache.query(query, queryOptions, ctx);
					var remotePromise = this.__remoteQueryAggregate(this.removeItemSupp(query), queryOptions, ctx).mapSuccess(function (items) {
						this.online();
						items = items.asArray ? items.asArray() : items;
						var meta = {
							refreshMeta: options.queryRefreshMeta ? this.cacheStrategy.queryRefreshMeta() : null,
							accessMeta: options.queryAccessMeta ? this.cacheStrategy.queryAccessMeta() : null
						};
						this.queryCache.insert(Objs.objectBy(
							this._options.queryKey, queryString,
							this._options.queryMetaKey, meta
						), ctx);
						var promises = [];
						Objs.iter(items, function (item) {
							promises.push(this.cacheInsertUpdate(item, {
								lockItem: false,
								lockAttrs: false,
								silent: options.silent && !this._options.optimisticRead,
								accessMeta: options.accessMeta,
								refreshMeta: options.refreshMeta,
								foreignKey: true
							}, ctx).mapSuccess(function (result) {
								return this.cacheOnlyGet(this.id_of(result), null, ctx);
							}, this));
						}, this);
						return Promise.and(promises).mapSuccess(function (items) {
							var arrIter = new ArrayIterator(items);
							return (new MappedIterator(arrIter, this.addItemSupp, this)).auto_destroy(arrIter, true);
						}, this);
					}, this).mapError(function () {
						this.offline();
						if (!this._options.optimisticRead) {
							return this.__itemCacheQuery(query, queryOptions, ctx);
						}
					}, this);
					return this._options.optimisticRead ? this.__itemCacheQuery(query, queryOptions, ctx) : remotePromise;
				}, this);
			},

			online: function () {
				this.trigger("online");
				this._online = true;
			},

			offline: function () {
				this.trigger("offline");
				this._online = false;
			},

			addItemMeta: function (data, meta) {
				data = Objs.clone(data, 1);
				data[this._options.itemMetaKey] = meta;
				return data;
			},

			addItemSupp: function (data) {
				return Objs.extend(Objs.clone(this._options.suppAttrs, 1), data);
			},
			
			removeItemSupp: function (data) {
				if (!this._options.suppAttrs)
					return data;
				return Objs.filter(data, function (value, key) {
					return !(key in this._options.suppAttrs);
				}, this);
			},

			addQueryMeta: function (data, meta) {
				data = Objs.clone(data, 1);
				data[this._options.queryMetaKey] = meta;
				return data;
			},

			removeItemMeta: function (data) {
				data = data || {};
				data = Objs.clone(data, 1);
				delete data[this._options.itemMetaKey];
				return data;
			},

			removeQueryMeta: function (data) {
				data = Objs.clone(data, 1);
				delete data[this._options.queryMetaKey];
				return data;
			},

			readItemMeta: function (data) {
				return data[this._options.itemMetaKey];
			},

			readQueryMeta: function (data) {
				return data[this._options.queryMetaKey];
			},

			unlockItem: function (id, ctx, opts) {
				return this.itemCache.get(id, ctx).mapSuccess(function (data) {
					if (!data)
						return data;
					var meta = this.readItemMeta(data);
					meta.lockedItem = false;
					meta.lockedAttrs = {};
					opts = opts || {};
					if (opts.meta)
						meta = Objs.extend(Objs.clone(meta, 1), opts.meta);
					return this.itemCache.update(id, this.addItemMeta({}, meta), ctx).success(function () {
						if (opts.meta)
							this._updated(this.id_row(id), this.addItemMeta({}, meta), ctx);
					}, this);
				}, this);
			},

			cleanup: function () {
				if (!this._online)
					return;
				this.queryCache.query().success(function (queries) {
					while (queries.hasNext()) {
						var query = queries.next();
						var meta = this.readQueryMeta(query);
						if (!this.cacheStrategy.validQueryRefreshMeta(meta.refreshMeta) || !this.cacheStrategy.validQueryAccessMeta(meta.accessMeta))
							this.queryCache.remove(this.queryCache.id_of(query));
					}
					queries.destroy();
				}, this);
				this.itemCache.query().success(function (items) {
					while (items.hasNext()) {
						var item = items.next();
						var meta = this.readItemMeta(item);
						if (!meta.lockedItem && Types.is_empty(meta.lockedAttrs) &&
							(!this.cacheStrategy.validItemRefreshMeta(meta.refreshMeta) || !this.cacheStrategy.validItemAccessMeta(meta.accessMeta)))
							this.itemCache.remove(this.itemCache.id_of(item));
					}
					items.destroy();
				}, this);
			},

			cachedIdToRemoteId: function (cachedId) {
				if (!this._foreignKey)
					return Promise.value(cachedId);
				return this.itemCache.get(cachedId).mapSuccess(function (item) {
					return item ? this.remoteStore.id_of(item) : null;
				}, this);
			},
			
			serialize: function () {
				return this.itemCache.serialize().mapSuccess(function (itemCacheSerialized) {
					return this.queryCache.serialize().mapSuccess(function (queryCacheSerialized) {
						return {
							items: itemCacheSerialized,
							queries: queryCacheSerialized
						};
					}, this);
				}, this);
			},
			
			unserialize: function (data) {
				return this.itemCache.unserialize(data.items).mapSuccess(function (items) {
					this.queryCache.unserialize(data.queries);
					return this._options.hideMetaData ? items.map(function (item) {
						return this.removeItemMeta(item);
					}, this) : items;
				}, this);
			}

		};
	});
});



Scoped.define("module:Stores.CacheStrategies.CacheStrategy", [
                                                              "base:Class"    
                                                              ], function (Class, scoped) {
	return Class.extend({scoped: scoped}, {

		itemRefreshMeta: function (refreshMeta) {},

		queryRefreshMeta: function (refreshMeta) {},

		itemAccessMeta: function (accessMeta) {},

		queryAccessMeta: function (accessMeta) {},

		validItemRefreshMeta: function (refreshMeta) {},

		validQueryRefreshMeta: function (refreshMeta) {},

		validItemAccessMeta: function (accessMeta) {},

		validQueryAccessMeta: function (accessMeta) {}


	});	
});


Scoped.define("module:Stores.CacheStrategies.ExpiryCacheStrategy", [
                                                                    "module:Stores.CacheStrategies.CacheStrategy",
                                                                    "base:Time",
                                                                    "base:Objs"
                                                                    ], function (CacheStrategy, Time, Objs, scoped) {
	return CacheStrategy.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (options) {
				inherited.constructor.call(this);
				this._options = Objs.extend({
					itemRefreshTime: 24 * 60 * 1000,
					itemAccessTime: 10 * 60 * 60 * 1000,
					queryRefreshTime: 24 * 60 * 1000,
					queryAccessTime: 10 * 60 * 60 * 1000,
					now: function () {
						return Time.now();
					}
				}, options);
			},

			itemRefreshMeta: function (refreshMeta) {
				if (refreshMeta)
					return refreshMeta;
				if (this._options.itemRefreshTime === null)
					return null;
				return this._options.now() + this._options.itemRefreshTime;
			},

			queryRefreshMeta: function (refreshMeta) {
				if (refreshMeta)
					return refreshMeta;
				if (this._options.queryRefreshTime === null)
					return null;
				return this._options.now() + this._options.queryRefreshTime;
			},

			itemAccessMeta: function (accessMeta) {
				if (this._options.itemAccessTime === null)
					return null;
				return this._options.now() + this._options.itemAccessTime;
			},

			queryAccessMeta: function (accessMeta) {
				if (this._options.queryAccessTime === null)
					return null;
				return this._options.now() + this._options.queryAccessTime;
			},

			validItemRefreshMeta: function (refreshMeta) {
				return this._options.itemRefreshTime === null || refreshMeta >= this._options.now();
			},

			validQueryRefreshMeta: function (refreshMeta) {
				return this._options.queryRefreshTime === null || refreshMeta >= this._options.now();
			},	

			validItemAccessMeta: function (accessMeta) {
				return this._options.itemAccessTime === null || accessMeta >= this._options.now();
			},

			validQueryAccessMeta: function (accessMeta) {
				return this._options.queryAccessTime === null || accessMeta >= this._options.now();
			}

		};
	});	
});
Scoped.define("module:Stores.PartialStoreWriteStrategies.WriteStrategy", [
                                                                          "base:Class"
                                                                          ], function (Class, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {
			
			init: function (partialStore) {
				this.partialStore = partialStore;
			},

			insert: function (data, ctx) {},

			remove: function (id, ctx) {},

			update: function (data, ctx, transaction_id) {}

		};
	});
});

Scoped.define("module:Stores.PartialStoreWriteStrategies.PostWriteStrategy", [
	"module:Stores.PartialStoreWriteStrategies.WriteStrategy",
	"base:Types",
	"base:Objs"
], function (Class, Types, Objs, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {

			insert: function (data, ctx) {
				return this.partialStore.remoteStore.insert(data, ctx).mapSuccess(function (data) {
					return this.partialStore.cachedStore.cacheInsert(data, {
						lockItem: false,
						silent: true,
						refreshMeta: true,
						accessMeta: true
					}, ctx);
				}, this);
			},

			remove: function (cachedId, ctx) {
				return this.partialStore.cachedStore.cachedIdToRemoteId(cachedId).mapSuccess(function (remoteId) {
					return this.partialStore.remoteStore.remove(remoteId, ctx).mapSuccess(function () {
						return this.partialStore.cachedStore.cacheRemove(cachedId, {
							ignoreLock: true,
							silent: true
						}, ctx);
					}, this);
				}, this);
			},

			update: function (cachedId, data, ctx, transaction_id) {
				var inner = function (updatedData) {
					var merger = Objs.extend(Objs.clone(data, 1), updatedData);
                    return this.partialStore.cachedStore.cacheUpdate(cachedId, merger, {
                        ignoreLock: false,
                        lockAttrs: false,
                        silent: true,
                        refreshMeta: true,
                        accessMeta: true
                    }, ctx, transaction_id);
				};
                var remoteRequired = !Types.is_empty(this.partialStore.cachedStore.removeItemSupp(data));
                if (!remoteRequired)
                	return inner.call(this);
				return this.partialStore.cachedStore.cachedIdToRemoteId(cachedId).mapSuccess(function (remoteId) {
					return this.partialStore.remoteStore.update(remoteId, data, ctx, transaction_id).mapSuccess(function (updatedData) {
						return inner.call(this, updatedData);
					}, this);
				}, this);
			}

		};
	});
});


Scoped.define("module:Stores.PartialStoreWriteStrategies.PreWriteStrategy", [
    "module:Stores.PartialStoreWriteStrategies.WriteStrategy",
    "base:Objs"
], function (Class, Objs, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {

            constructor: function (historyStore, options) {
                inherited.constructor.call(this);
                this._options = options || {};
            },

			insert: function (data) {
				return this.partialStore.cachedStore.cacheInsert(data, {
					lockItem: true,
					silent: true,
					refreshMeta: true,
					accessMeta: true
				}).mapSuccess(function (data) {
					nosuppdata = this.partialStore.cachedStore.removeItemSupp(data);
					var promise = this.partialStore.remoteStore.insert(nosuppdata).mapSuccess(function (remoteData) {
						return this.partialStore.cachedStore.cacheUpdate(this.partialStore.cachedStore.id_of(data), remoteData, {
							silent: true,
							unlockItem: true
						}).mapSuccess(function (addedRemoteData) {
							return Objs.extend(Objs.clone(data, 1), addedRemoteData);
						}, this);
					}, this).error(function () {
						this.partialStore.cachedStore.cacheRemove(this.partialStore.cachedStore.id_of(data), {
							ignoreLock: true,
							silent: false
						});
					}, this);
					return this._options.optimistic ? data : promise;
				}, this);
			},

			remove: function (cachedId) {
				return this.partialStore.cachedStore.cachedIdToRemoteId(cachedId).mapSuccess(function (remoteId) {
					var promise = this.partialStore.cachedStore.cacheRemove(cachedId, {
						ignoreLock: true,
						silent: true
					}).success(function () {
						this.partialStore.remoteStore.remove(remoteId);
					}, this);
                    return this._options.optimistic ? data : promise;
				}, this);
			},

			update: function (cachedId, data, ctx, transaction_id) {
				return this.partialStore.cachedStore.cachedIdToRemoteId(cachedId).mapSuccess(function (remoteId) {
					var promise = this.partialStore.cachedStore.cacheUpdate(cachedId, data, {
						lockAttrs: true,
						ignoreLock: false,
						silent: true,
						refreshMeta: false,
						accessMeta: true
					}, ctx, transaction_id).success(function (data) {
						data = this.partialStore.cachedStore.removeItemSupp(data);
						this.partialStore.remoteStore.update(remoteId, data, ctx, transaction_id).success(function () {
							this.partialStore.cachedStore.unlockItem(cachedId);
						}, this);
					}, this);
                    return this._options.optimistic ? data : promise;
				}, this);
			}
	
		};
	});
});


Scoped.define("module:Stores.PartialStoreWriteStrategies.CommitStrategy", [
	"module:Stores.PartialStoreWriteStrategies.WriteStrategy",
	"module:Stores.StoreHistory",
	"module:Stores.MemoryStore",
	"base:Objs",
	"base:Timers.Timer",
	"base:Promise"
], function (Class, StoreHistory, MemoryStore, Objs, Timer, Promise, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (historyStore, options) {
				inherited.constructor.call(this);
				this._options = options || {};
				this.historyStore = historyStore || this.auto_destroy(new MemoryStore());
			},
			
			init: function (partialStore) {
				inherited.init.call(this, partialStore);
				this.storeHistory = this.auto_destroy(new StoreHistory(null, this.historyStore, Objs.extend({
					source_id_key: partialStore.cachedStore.itemCache.id_key(),
					row_data: {
						pushed: false,
						success: false
					},
					filter_data: {
						pushed: false
					},
                    pushedStateOnFail: true
				}, this._options)));
				if (this._options.auto_push) {
					this._timer = this.auto_destroy(new Timer({
						fire: function () {
							this.push(this.partialStore);
						},
						context: this,
						start: true,
						delay: this._options.auto_push
					}));
				}
			},

			insert: function (data) {
				return this.partialStore.cachedStore.cacheInsert(data, {
					lockItem: true,
					silent: true,
					refreshMeta: true,
					accessMeta: true,
					meta: {
						pendingInsert: true
					}
				}).success(function (data) {
					data = this.partialStore.cachedStore.removeItemSupp(data);
					this.storeHistory.sourceInsert(data);
				}, this);
			},

			remove: function (id) {
				return this.partialStore.cachedStore.cachedIdToRemoteId(id).mapSuccess(function (remoteId) {
					return this.partialStore.cachedStore.cacheRemove(id, {
						ignoreLock: true,
						silent: true
					}).mapSuccess(function (data) {
						this.storeHistory.sourceRemove(id, this.partialStore.remoteStore.id_row(remoteId));
						return data;
					}, this);
				}, this);
			},

			update: function (id, data, ctx, transaction_id) {
				return this.partialStore.cachedStore.cacheUpdate(id, data, {
					lockAttrs: true,
					ignoreLock: true,
					silent: true,
					refreshMeta: false,
					accessMeta: true,
					meta: {
						pendingUpdate: true
					}
				}, ctx, transaction_id).success(function () {
					data = this.partialStore.cachedStore.removeItemSupp(data);
					this.storeHistory.sourceUpdate(id, data, undefined, undefined, transaction_id);
				}, this);
			},
			
			push: function () {
				if (this.pushing)
					return Promise.value(true);
				var failedIds = {};
				var unlockIds = {};
				var hs = this.storeHistory.historyStore;
                this.storeHistory.lockCommits();
				return hs.query({success: false}, {sort: {commit_id: 1}}).mapSuccess(function (iter) {
					var next = function () {
						if (!iter.hasNext()) {
							iter.destroy();
							this.pushing = false;
							this.storeHistory.unlockCommits();
							var promises = Objs.values(Objs.map(unlockIds, function (value, id) {
								if (value) {
									if (value === true) {
										return this.partialStore.cachedStore.unlockItem(id, undefined, {
											meta: {
												pendingUpdate: false
											}
										});
									} else {
										return this.partialStore.cachedStore.cacheUpdate(id, value, {
											unlockItem: true,
											silent: false,
											meta: {
												pendingInsert: false
											}
										});
									}
								} else
									return Promise.value(true);
							}, this));
							return Promise.and(promises);
						}
						var commit = iter.next();
						var commit_id = hs.id_of(commit);
						if (commit_id in failedIds) {
							hs.update(commit_id, {
								pushed: this._options.pushedStateOnFail,
								success: false
							});
							return next.apply(this);
						} else {
							var promise = null;
							if (commit.type === "insert") {
								promise = this.partialStore.remoteStore.insert(commit.row);
							} else if (commit.type === "update") {
								promise = this.partialStore.cachedStore.cachedIdToRemoteId(commit.row_id).mapSuccess(function (remoteId) {
									return this.partialStore.remoteStore.update(remoteId, commit.row, undefined, commit.transaction_id);
								}, this);
							} else if (commit.type === "remove") {
								promise = this.partialStore.remoteStore.remove(commit.row ? this.partialStore.remoteStore.id_of(commit.row) : commit.row_id);
							}
							return promise.mapSuccess(function (ret) {
								hs.update(commit_id, {
									pushed: true,
									success: true
								});
								if (!(commit.row_id in unlockIds)) {
									unlockIds[commit.row_id] = true;
									if (commit.type === "insert") {
										unlockIds[commit.row_id] = this.partialStore.remoteStore.id_row(this.partialStore.remoteStore.id_of(commit.row));
									}
								}
								return next.apply(this);
							}, this).mapError(function () {
								hs.update(commit_id, {
									pushed: this._options.pushedStateOnFail,
									success: false
								});
								failedIds[commit_id] = true;
								unlockIds[commit.row_id] = false;
								return next.apply(this);
							}, this);
						}
					};
					return next.apply(this);
				}, this);
			}

		};
	});
});



Scoped.define("module:Stores.PartialStoreWriteStrategies.DelegatedWriteStrategy", [
    "module:Stores.PartialStoreWriteStrategies.WriteStrategy"
], function (Class, scoped) {
    return Class.extend({scoped: scoped}, function (inherited) {
        return {

            constructor: function (insertWriteStrategy, updateWriteStrategy, removeWriteStrategy) {
                inherited.constructor.call(this);
                this._insertWriteStrategy = insertWriteStrategy;
                this._updateWriteStrategy = updateWriteStrategy;
                this._removeWriteStrategy = removeWriteStrategy;
            },

            init: function (partialStore) {
                inherited.init.call(this, partialStore);
                this._insertWriteStrategy.init(partialStore);
                this._updateWriteStrategy.init(partialStore);
                this._removeWriteStrategy.init(partialStore);
            },

            insert: function () {
                return this._insertWriteStrategy.insert.apply(this._insertWriteStrategy, arguments);
            },

            remove: function () {
                return this._updateWriteStrategy.remove.apply(this._updateWriteStrategy, arguments);
            },

            update: function () {
                return this._removeWriteStrategy.update.apply(this._removeWriteStrategy, arguments);
            }

        };
    });
});


Scoped.define("module:Stores.PartialStore", [
	"module:Stores.BaseStore",
	"module:Stores.CachedStore",
	"module:Stores.PartialStoreWriteStrategies.PostWriteStrategy",
	"module:Stores.PartialStoreWatcher",
	"base:Objs",
	"base:Types"
], function (Store, CachedStore, PostWriteStrategy, PartialStoreWatcher, Objs, Types, scoped) {
	return Store.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (remoteStore, options) {
				inherited.constructor.call(this, options);
				this._options = Objs.extend({}, options);
				if (this._options.remoteWatcher)
					this.remoteWatcher = this._options.remoteWatcher;
				this.remoteStore = remoteStore;
				this.cachedStore = new CachedStore(remoteStore, this._options);
				this.writeStrategy = this._options.writeStrategy || this.auto_destroy(new PostWriteStrategy());
				if (this.remoteWatcher) {
					this.remoteWatcher.on("insert", this._remoteInsert, this);
					this.remoteWatcher.on("update", this._remoteUpdate, this);
					this.remoteWatcher.on("remove", this._remoteRemove, this);
					this._watcher = new PartialStoreWatcher(this);
				}
				this.cachedStore.on("insert", this._inserted, this);
				this.cachedStore.on("remove", this._removed, this);
				this.cachedStore.on("update", this._updated, this);
				this.writeStrategy.init(this);
			},
			
			id_key: function () {
				return this.cachedStore.id_key();
			},
			
			destroy: function () {
				if (this.remoteWatcher)
					this.remoteWatcher.off(null, null, this);
				if (this._watcher)
					this._watcher.destroy();
				this.cachedStore.destroy();
				inherited.destroy.call(this);
			},

			_insert: function (data, ctx) {
				return this.writeStrategy.insert(data, ctx);
			},
			
			_remove: function (id, ctx) {
				return this.writeStrategy.remove(id, ctx);
			},
			
			_update: function (id, data, ctx, transaction_id) {
				return this.cachedStore.cacheOnlyGet(id, {}, ctx).mapSuccess(function (cachedData) {
					var diff = Objs.diff(data, cachedData || {});
					return Types.is_empty(diff) ? cachedData : this.writeStrategy.update(id, data, ctx, transaction_id);
				}, this);
			},

			_get: function (id, ctx) {
				return this.cachedStore.get(id, ctx);
			},
			
			_query: function (query, options, ctx) {
				return this.cachedStore.query(query, options, ctx);
			},			
			
			_query_capabilities: function () {
				return this.cachedStore._query_capabilities();
			},
			
			_remoteInsert: function (data, ctx) {
				this.cachedStore.cacheInsertUpdate(data, {
					lockItem: false,
					silent: false,
					refreshMeta: true,
					accessMeta: true,
					foreignKey: true,
					keepCache: true
				}, ctx);
			},
			
			_remoteUpdate: function (row, data, ctx, pre_data, transaction_id) {
				if (transaction_id && this._useTransactionIds && this.isMyTransactionId(transaction_id))
					return;
				var id = this.remoteStore.id_of(row);
				this.cachedStore.cacheUpdate(id, data, {
					ignoreLock: false,
					lockAttrs: false,
					silent: false,
					accessMeta: true,
					refreshMeta: true,
					foreignKey: true
				}, ctx, transaction_id);
			},
			
			_remoteRemove: function (id, ctx) {
				this.cachedStore.cacheRemove(id, {
					ignoreLock: false,
					silent: false,
					foreignKey: true
				}, ctx);
			},
			
			serialize: function () {
				return this.cachedStore.serialize();
			},
			
			unserialize: function (data) {
				return this.cachedStore.unserialize(data).success(function (items) {
					items.forEach(function (item) {
						this._inserted(item);
					}, this);
				}, this);
			}

		};
	});	
});


Scoped.define("module:Stores.PartialStoreWatcher", [
    "module:Stores.Watchers.LocalWatcher"                                                    
], function (StoreWatcher, scoped) {
	return StoreWatcher.extend({scoped: scoped}, function (inherited) {
		return {
			
			_watchItem : function(id) {
				inherited.watchItem.call(this, id);
				this._store.cachedStore.cachedIdToRemoteId(id).success(function (remoteId) {
					this._store.remoteWatcher.watchItem(remoteId, this);
				}, this);
			},

			_unwatchItem : function(id) {
				inherited.unwatchItem.call(this, id);
				this._store.cachedStore.cachedIdToRemoteId(id).success(function (remoteId) {
					this._store.remoteWatcher.unwatchItem(remoteId, this);
				}, this);
			},

			_watchInsert : function(query) {
				inherited.watchInsert.call(this, query);
				this._store.remoteWatcher.watchInsert(query, this);
			},

			_unwatchInsert : function(query) {
				inherited.unwatchInsert.call(this, query);
				this._store.remoteWatcher.unwatchInsert(query, this);
			}			
			
		};
	});
});
Scoped.define("module:Stores.ChannelClientStore", [
    "module:Stores.Invokers.AbstractInvokerStore",
    "base:Channels.TransportChannel",
    "base:Functions"
], function (AbstractInvokerStore, TransportChannel, Functions, scoped) {
    return AbstractInvokerStore.extend({scoped: scoped}, function (inherited) {
        return {

            constructor: function (sender, receiver, options) {
                inherited.constructor.call(this, options);
                this.transport = this.auto_destroy(new TransportChannel(sender, receiver));
                this.transport._reply = Functions.as_method(function (message, data) {
                    if (message === "event")
                        this.trigger.apply(this, [data.event].concat(data.args));
                }, this);
            },

            _invoke: function (member, data, context) {
                return this.transport.send("invoke", {
                    member: member,
                    data: data,
                    context: context
                });
            },

            _invokeWatcher: function (member, data, context) {
                return this.transport.send("invokewatcher", {
                    member: member,
                    data: data,
                    context: context
                });
            }

        };
    });
});


Scoped.define("module:Stores.ChannelServerStore", [
    "module:Stores.Invokers.StoreInvokeeInvoker",
    "base:Channels.TransportChannel",
    "base:Functions"
], function (StoreInvokeeInvoker, TransportChannel, Functions, scoped) {
    return StoreInvokeeInvoker.extend({scoped: scoped}, function (inherited) {
        return {

            constructor: function (sender, receiver, store) {
                inherited.constructor.call(this, store);
                this.transport = this.auto_destroy(new TransportChannel(sender, receiver));
                this.transport._reply = Functions.as_method(function (message, data) {
                    if (message === "invoke")
                        return this.storeInvoke(data.member, data.data, data.context);
                    if (message === "invokewatcher")
                        return this.storeInvokeWatcher(data.member, data.data, data.context);
                }, this);
                store.on('all', function (eventName) {
                    this.transport.send("event", {
                        event: eventName,
                        args: Functions.getArguments(arguments, 1)
                    }, {
                        stateless: true
                    });
                }, this);
            }

        };
    });
});

Scoped.define("module:Stores.RemoteStore", [
    "module:Stores.Invokers.InvokerStore",
    "module:Stores.Invokers.StoreInvokeeRestInvoker",
    "module:Stores.Invokers.RestInvokeeAjaxInvoker"
], function (Store, RestInvoker, AjaxInvoker, scoped) {
 	return Store.extend({scoped: scoped}, function (inherited) {
 		return {
 			
 			constructor: function (ajax, restOptions, storeOptions) {
 				var ajaxInvoker = new AjaxInvoker(ajax);
 				var restInvoker = new RestInvoker(ajaxInvoker, restOptions);
 				inherited.constructor.call(this, restInvoker, storeOptions);
 				this.auto_destroy(restInvoker);
 				this.auto_destroy(ajaxInvoker);
			}			
		
		};
	});
});

Scoped.define("module:Stores.SocketStore", [
                                            "module:Stores.BaseStore",
                                            "base:Objs"
                                            ], function (BaseStore, Objs, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (options, socket, prefix) {
				inherited.constructor.call(this, options);
				this.__socket = socket;
				this.__prefix = prefix;
			},

			/** @suppress {missingProperties} */
			__send: function (action, data) {
				this.__socket.emit(this.__prefix + ":" + action, data);
			},

			_insert: function (data) {
				this.__send("insert", data);
			},

			_remove: function (id) {
				this.__send("remove", id);
			},

			_update: function (id, data) {
				this.__send("update", Objs.objectBy(id, data));
			}	

		};
	});
});



Scoped.define("module:Stores.Watchers.ConsumerWatcher", [
                                                         "module:Stores.Watchers.StoreWatcher"
                                                         ], function(StoreWatcher, scoped) {
	return StoreWatcher.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (sender, receiver, options) {
				inherited.constructor.call(this, options);
				this._receiver = receiver;
				this._sender = sender;
				receiver.on("receive", function (message, data) {
					if (message === "insert")
						this._insertedWatchedInsert(data);
					if (message === "update")
						this._updatedWatchedItem(data.row, data.data, data.transaction_id);
					else if (message === "remove")
						this._removedWatchedItem(data);
				}, this);
			},

			destroy: function () {
				this._receiver.off(null, null, this);
				inherited.destroy.apply(this);
			},

			_watchItem: function (id) {
				this._sender.send("watch_item", id);
			},

			_unwatchItem: function (id) {
				this._sender.send("unwatch_item", id);
			},

			_watchInsert: function (query) {
				this._sender.send("watch_insert", query);
			},

			_unwatchInsert: function (query) {
				this._sender.send("unwatch_insert", query);
			}

		};
	});
});


Scoped.define("module:Stores.Watchers.ProducerWatcher", [
                                                         "base:Class"
                                                         ], function(Class, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (sender, receiver, watcher) {
				inherited.constructor.apply(this);
				this._watcher = watcher;
				this._receiver = receiver;
				receiver.on("receive", function (message, data) {
					if (message === "watch_item")
						watcher.watchItem(data, this);
					else if (message === "unwatch_item")
						watcher.unwatchItem(data, this);
					else if (message === "watch_insert")
						watcher.watchInsert(data, this);
					else if (message === "unwatch_insert")
						watcher.unwatchInsert(data, this);
				}, this);
				watcher.on("insert", function (data) {
					sender.send("insert", data);
				}, this).on("update", function (row, data, dummy1, dummy2, transaction_id) {
					sender.send("update", {row: row, data: data, transaction_id: transaction_id});
				}, this).on("remove", function (id) {
					sender.send("remove", id);
				}, this);
			},

			destroy: function () {
				this._receiver.off(null, null, this);
				this._watcher.off(null, null, this);
				inherited.destroy.apply(this);
			}

		};
	});
});

Scoped.define("module:Stores.Watchers.ListWatcher", [
    "module:Stores.Watchers.StoreWatcher",
    "base:Objs"
], function(StoreWatcher, Objs, scoped) {
	return StoreWatcher.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (store, watchers, options) {
				options = options || {};
				options.id_key = store.id_key();
				this.__watchers = {};
				inherited.constructor.call(this, options);
				if (watchers)
					watchers.forEach(this.addWatcher, this);
			},

			addWatcher: function (watcher) {
				if (!this.__watchers[watcher.cid()]) {
					this.delegateEvents(["insert", "update", "remove"], watcher);
					this.itemsIterator().iterate(watcher.watchItem, watcher);
					this.insertsIterator().iterate(watcher.watchInsert, watcher);
                    this.__watchers[watcher.cid()] = watcher;
                }
                return this;
			},

            removeWatcher: function (watcher) {
                if (this.__watchers[watcher.cid()]) {
					watcher.off(null, null, this);
					this.itemsIterator().iterate(watcher.unwatchItem, watcher);
					this.insertsIterator().iterate(watcher.unwatchInsert, watcher);
                    delete this.__watchers[watcher.cid()];
                }
                return this;
            },

			getWatchers: function () {
				return Objs.values(this.__watchers);
			},

			__forEachWatcher: function (f, ctx) {
				Objs.iter(this.__watchers, f, ctx || this);
			},

			destroy: function () {
				this.__forEachWatcher(this.removeWatcher);
				inherited.destroy.apply(this);
			},
			
			_watchItem : function(id) {
				this.__forEachWatcher(function (watcher) {
					watcher.watchItem(id);
				});
			},

			_unwatchItem : function(id) {
				this.__forEachWatcher(function (watcher) {
					watcher.unwatchItem(id);
				});
			},

			_watchInsert : function(query) {
				this.__forEachWatcher(function (watcher) {
					watcher.watchInsert(query);
				});
			},

			_unwatchInsert : function(query) {
				this.__forEachWatcher(function (watcher) {
					watcher.unwatchInsert(query);
				});
			}

		};
	});
});

Scoped.define("module:Stores.Watchers.LocalWatcher", [
                                                      "module:Stores.Watchers.StoreWatcher"
                                                      ], function(StoreWatcher, scoped) {
	return StoreWatcher.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (store, options) {
				options = options || {};
				options.id_key = store.id_key();
				inherited.constructor.call(this, options);
				this._store = store;
				this._store.on("insert", function (data, ctx) {
					this._insertedInsert(data, ctx);
				}, this).on("update", function (row, data, ctx, pre_data, transaction_id) {
					this._updatedItem(row, data, ctx, transaction_id);
				}, this).on("remove", function (id, ctx) {
					this._removedItem(id, ctx);
				}, this);
			},

			destroy: function () {
				this._store.off(null, null, this);
				inherited.destroy.apply(this);
			}

		};
	});
});

Scoped.define("module:Stores.Watchers.PollWatcher", [
                                                     "module:Stores.Watchers.StoreWatcher",
                                                     "base:Comparators",
                                                     "base:Objs",
                                                     "base:Timers.Timer"
                                                     ], function(StoreWatcher, Comparators, Objs, Timer, scoped) {
	return StoreWatcher.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (store, options) {
				options = options || {};
				options.id_key = store.id_key();
				inherited.constructor.call(this, options);
				this._store = store;
				this.__itemCache = {};
				this.__lastKey = null;
				this.__lastKeyIds = {};
				this.__insertsCount = 0;
				this.__increasingKey = options.increasing_key || this.id_key;
				this.__ignoreUpdates = options.ignore_updates;
				if (options.auto_poll) {
					this.auto_destroy(new Timer({
						fire: this.poll,
						context: this,
						start: true,
						delay: options.auto_poll
					}));
				}
			},

			_watchItem : function(id, context) {
				this.__itemCache[id] = {
					context: context,
					value: null
                };
			},

			_unwatchItem : function(id) {
				delete this.__itemCache[id];
			},

			_queryLastKey: function () {
				var sort = {};
				return this._store.query({}, {
					limit: 1,
					sort: Objs.objectBy(this.__increasingKey, -1)
				}).mapSuccess(function (iter) {
					var result = iter.hasNext() ? iter.next()[this.__increasingKey] : null;
					iter.destroy();
					return result;
				}, this).mapError(function () {
					return null;
				});
			},

			_watchInsert : function(query) {
				if (this.__insertsCount === 0) {
					this._queryLastKey().success(function (value) {
						this.__lastKey = value;
						this.__lastKeyIds = {};
					}, this);
				}
				this.__insertsCount++;
			},

			_unwatchInsert : function(query) {
				this.__insertsCount--;
				if (this.__insertsCount === 0)
					this.__lastKey = null;
			},

			poll: function () {
				if (!this.__ignoreUpdates) {
					Objs.iter(this.__itemCache, function (cached, id) {
						this._store.get(id, cached.context).success(function (data) {
							if (!data)
								this._removedItem(id);
							else {
								var updatable = cached.value && !Comparators.deepEqual(cached.value, data, -1);
                                cached.value = Objs.clone(data, 1);
								if (updatable)
									this._updatedItem(data, data);
							}
						}, this).error(function (err) {
							if (err && err.error && err.error == 404)
								this._removedItem(id);
						}, this);
					}, this);
				}
				if (this.destroyed())
					return;
				if (this.__lastKey) {
					this.insertsIterator().iterate(function (q) {
						var query = q.query;
						var options = q.options;
						var keyQuery = Objs.objectBy(this.__increasingKey, {"$gte": this.__lastKey});
						this._store.query(Objs.extend(keyQuery, query), options).success(function (result) {
							while (result.hasNext()) {
								var item = result.next();
								var id = item[this.__increasingKey];
								if (!this.__lastKeyIds[id])
									this._insertedInsert(item);
								this.__lastKeyIds[id] = true;
								if (id > this.__lastKey)
									this.__lastKey = id; 
							}
							result.destroy();
						}, this);
					}, this);
				} else {
					this._queryLastKey().success(function (value) {
						if (value !== this.__lastKey) {
							this.__lastKey = value;
							this.__lastKeyIds = {};
						}
					}, this);
				}
			}

		};
	});
});

Scoped.define("module:Stores.Watchers.StoreWatcherMixin", [], function() {
	return {

		watchItem : function(id, context) {},

		unwatchItem : function(id, context) {},

		watchInsert : function(query, context) {},

		unwatchInsert : function(query, context) {},

		_removedWatchedItem : function(id) {
			this.trigger("remove", id);
		},

		_updatedWatchedItem : function(row, data, transaction_id) {
			this.trigger("update", row, data, null, null, transaction_id);
		},

		_insertedWatchedInsert : function(data) {
			this.trigger("insert", data);
		},
		
		delegateStoreEvents: function (store) {
			this.on("insert", function (data) {
				store.trigger("insert", data);
			}, store).on("update", function (row, data, transaction_id) {
				store.trigger("update", row, data, null, null, transaction_id);
			}, store).on("remove", function (id) {
				store.trigger("remove", id);
			}, store);
		},

		undelegateStoreEvents: function (store) {
			this.off(null, null, store);
		}

	};	
});


Scoped.define("module:Stores.Watchers.StoreWatcher", [
	"base:Class",
	"base:Objs",
	"base:Events.EventsMixin",
	"base:Classes.ContextRegistry",
	"base:Comparators",
	"module:Stores.Watchers.StoreWatcherMixin",
	"module:Queries"
], function(Class, Objs, EventsMixin, ContextRegistry, Comparators, StoreWatcherMixin, Queries, scoped) {
	return Class.extend({scoped: scoped}, [EventsMixin, StoreWatcherMixin, function (inherited) {
		return {

			constructor: function (options) {
				inherited.constructor.call(this);
				options = options || {};
				if (options.id_key)
					this.id_key = options.id_key;
				else
					this.id_key = "id";
				this.__ctx = options.ctx;
				this.__customCtxFilter = options.customCtxFilter;
				this.__items = new ContextRegistry();
				this.__inserts = new ContextRegistry(Queries.serialize, Queries);
			},

			destroy: function () {
				this.insertsIterator().iterate(this.unwatchInsert, this);
				this.itemsIterator().iterate(this.unwatchItem, this);
				this.__inserts.destroy();
				this.__items.destroy();
				inherited.destroy.call(this);
			},

			insertsIterator: function () {
				return this.__inserts.iterator();
			},

            itemsIterator: function () {
                return this.__items.iterator();
            },

			watchItem : function(id, context) {
				if (this.__items.register(id, context))
                    this._watchItem(id);
			},

			unwatchItem : function(id, context) {
				this.__items.unregister(id, context).forEach(this._unwatchItem, this);
			},

			watchInsert : function(query, context) {
				if (this.__inserts.register(query, context))
					this._watchInsert(query);
			},

			unwatchInsert : function(query, context) {
				this.__inserts.unregister(query, context).forEach(this._unwatchInsert, this);
			},

			_ctxFilter: function (ctx, data) {
				return !this.__ctx || !ctx || Comparators.deepEqual(this.__ctx, ctx, 2) || (this.__customCtxFilter && this.__customCtxFilter(this.__ctx, ctx, data));
			},

			_removedItem : function(id, ctx) {
				if (!this._ctxFilter(ctx))
					return;
				if (!this.__items.get(id))
					return;
				// @Oliver: I am not sure why this is commented out, but tests fail if we comment it in.
				// this.unwatchItem(id, null);
				this._removedWatchedItem(id);
			},

			_updatedItem : function(row, data, ctx, transaction_id) {
                if (!this._ctxFilter(ctx, row))
                    return;
				var id = row[this.id_key];
				if (this.__items.get(id))
					this._updatedWatchedItem(row, data, transaction_id);
				this._insertedInsert(Objs.extend(Objs.clone(row, 1), data), ctx);
			},

			_insertedInsert : function(data, ctx) {
                if (!this._ctxFilter(ctx, data))
                    return;
				var trig = false;
				var iter = this.__inserts.iterator();
				while (!trig && iter.hasNext())
					trig = Queries.evaluate(iter.next().query, data);
				if (trig)
					this._insertedWatchedInsert(data);
			},

			unregisterItem: function (id, context) {
				if (this.__items.unregister(id, context))
					this._unregisterItem(id);
			},			

			_watchItem : function(id) {},

			_unwatchItem : function(id) {},

			_watchInsert : function(query) {},

			_unwatchInsert : function(query) {},

			reconnect: function () {
                this.itemsIterator().iterate(this._watchItem, this);
                this.insertsIterator().iterate(this._watchInsert, this);
			}

		};
	}]);
});


Scoped.extend("module:Modelling.ActiveModel", [
    "base:Properties.Properties",
    "base:Async",
    "base:Objs",
    "base:Promise",
    "module:Queries"
], function(Properties, Async, Objs, Promise, Queries, scoped) {
    return Properties.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(table, query, queryopts, options) {
                inherited.constructor.call(this);
                this._options = options || {};
                this._table = table;
                this._query = query;
                this._queryopts = queryopts || {};
                this.set("model", null);
                this._unregisterModel();
                if (!this._options.inactive) {
                    if (this._watcher()) {
                        this._watcher().watchInsert({
                            query: this._query,
                            options: Objs.extend({
                                limit: 1
                            }, this._queryopts)
                        }, this);
                    }
                    this._table.on("create", function(data) {
                        if (!Queries.evaluate(this._query, data))
                            return;
                        if (!this._queryopts.sort && this.get("model"))
                            return;
                        if (this.get("model"))
                            this._unregisterModel();
                        else
                            this._registerModel(this._table.materialize(data));
                    }, this);
                }
            },

            destroy: function() {
                if (this._watcher()) {
                    this._watcher().unwatchInsert(null, this);
                    this._watcher().unwatchItem(null, this);
                }
                if (this.get("model")) {
                    this.get("model").off(null, null, this);
                    this.get("model").decreaseRef();
                }
                this._table.off(null, null, this);
                inherited.destroy.call(this);
            },

            assertExistence: function() {
                if (this.get("model"))
                    return Promise.value(this.get("model"));
                if (!this.__find_by_acquiring)
                    return Promise.error("Not found");
                var promise = Promise.create();
                this.once('find-by-acquired', function() {
                    if (this.get("model"))
                        promise.asyncSuccess(this.get('model'));
                    else
                        promise.asyncError("Not found");
                }, this);
                return promise;
            },

            _watcher: function() {
                return this._table.store().watcher();
            },

            update: function(query) {
                this._query = query;
                if (!this.get("model") || !Properties.is_class_instance(this.get("model")) || !Queries.evaluate(this._query, this.get("model").data()))
                    this._unregisterModel();
            },

            _registerModel: function(model) {
                this.set("model", model);
                model.increaseRef();
                if (this._watcher() && !model.isNew())
                    this._watcher().watchItem(model.id(), this);
                model.on("change", function() {
                    if (!Queries.evaluate(this._query, model.data()))
                        this._unregisterModel();
                }, this);
                model.on("remove", function() {
                    this._unregisterModel();
                }, this);
            },

            _unregisterModel: function() {
                var model = this.get("model");
                if (model && Properties.is_class_instance(model)) {
                    Async.eventually(function() {
                        model.decreaseRef();
                    });
                }
                if (this._watcher())
                    this._watcher().unwatchItem(null, this);
                this.set("model", null);
                this.__find_by_acquiring = true;
                this._table.findBy(this._query, this._queryopts).success(function(model) {
                    if (model)
                        this._registerModel(model);
                    else if (this._options.create_virtual)
                        this._registerModel(this._options.create_virtual.call(this._options.create_virtual_ctx || this, this._query));
                    else if (this._options.create_on_demand) {
                        model = this._table.newModel(this._query);
                        this._registerModel(model);
                        model.save();
                    }
                }, this).callback(function() {
                    this.__find_by_acquiring = false;
                    this.trigger('find-by-acquired');
                }, this);
            }

        };
    });
});
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
Scoped.define("module:Modelling.Associations.BelongsToAssociation", [
    "module:Modelling.Associations.OneAssociation",
    "base:Objs"
], function(OneAssociation, Objs, scoped) {
    return OneAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function() {
                inherited.constructor.apply(this, arguments);
                this._model.on("change:" + this._foreign_key, this._queryChanged, this);
            },

            _buildQuery: function(query) {
                var result = this._model.get(this._foreign_key);
                if (this._options.map)
                    result = this._options.map.call(this._options.mapctx || this, result);
                return Objs.extend(Objs.objectBy(
                    this._options.foreign_attr || this._foreignTable().primary_key(),
                    result
                ), query);
            },

            _unset: function() {
                this._model.set(this._foreign_key, null);
            },

            _set: function(model) {
                this._model.set(this._foreign_key, model.id());
            }

        };
    });
});
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
Scoped.define("module:Modelling.Associations.HasManyCustomAssociation", [
    "module:Modelling.Associations.HasManyAssociation",
    "base:Objs"
], function(HasManyAssociation, Objs, scoped) {
    return HasManyAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            _buildQuery: function(query, options) {
                return {
                    "query": this._foreign_key,
                    "options": Objs.clone(options || {}, 1)
                };
            }

        };
    });
});
Scoped.define("module:Modelling.Associations.HasManyInArrayAssociation", [
    "module:Modelling.Associations.HasManyAssociation",
    "base:Objs"
], function(HasManyAssociation, Objs, scoped) {
    return HasManyAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            _buildQuery: function(query, options) {
                return {
                    "query": Objs.objectBy(this._foreign_key, {
                        "$elemMatch": {
                            "$eq": this._model.id()
                        }
                    })
                };
            },

            _remove: function(item) {
                item.set(this._foreign_key, item.get(this._foreign_key).filter(function(key) {
                    return key !== this._model.id();
                }, this));
            },

            _add: function(item) {
                var current = Objs.clone(item.get(this._foreign_key), 1);
                var exists = current.some(function(key) {
                    return key === this._model.id();
                }, this);
                if (!exists) {
                    current.push(this._model.id());
                    item.set(this._foreign_key, current);
                }
            }

        };
    });
});
Scoped.define("module:Modelling.Associations.HasManyKeyAssociation", [
    "module:Modelling.Associations.HasManyAssociation",
    "base:Objs"
], function(HasManyAssociation, Objs, scoped) {
    return HasManyAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            _buildQuery: function(query, options) {
                return {
                    "query": Objs.extend(Objs.objectBy(this._foreign_key, this._model.id()), query),
                    "options": options
                };
            },

            _remove: function(item) {
                item.set(this._foreign_key, null);
            },

            _add: function(item) {
                item.set(this._foreign_key, this._model.id());
            }

        };
    });
});
Scoped.define("module:Modelling.Associations.HasManyThroughArrayAssociation", [
    "module:Modelling.Associations.HasManyAssociation",
    "base:Objs",
    "base:Types",
    "base:Functions"
], function(HasManyAssociation, Objs, Types, Functions, scoped) {
    return HasManyAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            __foreignKeyArray: function() {
                return Types.is_array(this._foreign_key) ? this._foreign_key : [this._foreign_key];
            },

            __arrayMapToKeys: function(a) {
                if (!this._options.sub_key)
                    return a;
                return a.map(function(i) {
                    return i[this._options.sub_key];
                }, this);
            },

            __readForeignKey: function() {
                var result = [];
                this.__foreignKeyArray().forEach(function(fk) {
                    result = result.concat(this._model.get(fk) || []);
                }, this);
                return this.__arrayMapToKeys(result);
            },

            constructor: function() {
                inherited.constructor.apply(this, arguments);
                this._options.collectionOptions = Objs.extend({
                    secondary_ident: Functions.as_method(this._mapItemValue, this)
                }, this._options.collectionOptions);
                this.__foreignKeyArray().forEach(function(fk) {
                    this._model.on("change:" + fk, this._queryChanged, this);
                }, this);
            },

            _buildQuery: function(query, options) {
                var arr = this.__readForeignKey();
                if (this._options.map)
                    arr = arr.map(this._options.map, this._options.mapctx || this);
                return {
                    "query": Objs.extend(Objs.objectBy(
                        this._options.foreign_attr || this._foreignTable().primary_key(), Objs.objectBy(
                            "$in",
                            arr
                        )), query)
                };
            },

            _queryCollectionUpdated: function(coll) {
                if (this._options.create_virtual) {
                    this.__readForeignKey().forEach(function(key) {
                        var models = [];
                        var realModels = 0;
                        coll.iterate(function(item) {
                            if (!this._matchItem(item, key))
                                return;
                            if (item.hasId())
                                realModels = 1;
                            else
                                models.push(item);
                        }, this);
                        while (models.length + realModels > 1)
                            coll.remove(models.shift());
                        if (models.length + realModels === 0)
                            coll.add(this._options.create_virtual.call(this._options.create_virtual_ctx || this, key));
                    }, this);
                }
            },

            _mapValue: function(value) {
                if (this._options.map)
                    value = this._options.map.call(this._options.mapctx || this, value);
                return value;
            },

            _mapItemValue: function(item) {
                return this._mapValue(item.get(this._options.foreign_attr || this._foreignTable().primary_key()));
            },

            _matchItem: function(item, key) {
                return this._mapItemValue(item) === this._mapValue(key);
            },

            _remove: function(item) {
                this.__foreignKeyArray().forEach(function(fk) {
                    this._model.set(fk, this._model.get(fk).filter(function(key) {
                        return !this._matchItem(item, this._options.sub_key ? key[this._options.sub_key] : key);
                    }, this));
                }, this);
                if (this._options.create_virtual && this.collection.value() && !item.destroyed())
                    this.collection.value().remove(item);
            },

            _add: function(item) {
                if (!this.__readForeignKey().some(function(key) {
                        return this._matchItem(item, key);
                    }, this)) {
                    var fk = Types.is_array(this._foreign_key) ? this._foreign_key[0] : this._foreign_key;
                    var current = Objs.clone(this._model.get(fk) || [], 1);
                    var add = item.get(this._options.foreign_attr || this._foreignTable().primary_key());
                    current.push(this._options.sub_key ? Objs.objectBy(this._options.sub_key, add) : add);
                    if (this._options.create_virtual && this.collection.value())
                        this.collection.value().add(item);
                    this._model.set(fk, current);
                }
            }

        };
    });
});
Scoped.define("module:Modelling.Associations.HasOneAssociation", [
    "module:Modelling.Associations.OneAssociation",
    "base:Objs"
], function(HasManyAssociation, Objs, scoped) {
    return HasManyAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            _buildQuery: function(query, options) {
                return Objs.extend(Objs.objectBy(this._foreign_key, this._model.id()), query);
            },

            _unset: function() {
                if (this.active.value() && this.active.value().get("model"))
                    this.active.value().get("model").set(this._foreign_key, null);
            },

            _set: function(model) {
                model.set(this._foreign_key, this._model.id());
                this._unset();
            }

        };
    });
});
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
                if (this._model && this._model.isNew && !this._model.destroyed()) {
                    if (this._options.delete_cascade) {
                        this._model.registerHook("remove", function(result) {
                            return this.remove().mapSuccess(function() {
                                return result;
                            });
                        }, this);
                    }
                }
            },

            destroy: function() {
                this.active.destroy();
                inherited.destroy.apply(this);
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

            assertExistence: function(reference) {
                return this.active.acquire(reference).assertExistence();
            },

            remove: function() {
                return this.assertExistence().success(function(model) {
                    model.increaseRef();
                    this.active.destroy();
                    model.weaklyRemove();
                    model.weakDestroy();
                    this.active = new SharedObjectFactory(this.newActiveModel, this);
                }, this);
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
Scoped.define("module:Modelling.Associations.PolymorphicBelongsToAssociation", [
    "module:Modelling.Associations.BelongsToAssociation",
    "base:Objs"
], function(BelongsToAssociation, Objs, scoped) {
    return BelongsToAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(model, foreign_key, foreign_type_key, table_lookup_function, options) {
                inherited.constructor.call(this, model, null, foreign_key, options);
                this._foreign_type_key = foreign_type_key;
                this._table_lookup_function = table_lookup_function;
            },

            _foreignTable: function() {
                return this._table_lookup_function(this._model.get(this._foreign_type_key));
            },

            _unset: function() {
                inherited._unset.call(this);
                this._model.set(this._foreign_type_key, null);
            },

            _set: function(model) {
                inherited._set.call(this, model);
                this._model.set(this._foreign_type_key, model.type());
            }

        };
    });
});
Scoped.define("module:Modelling.Associations.PolymorphicHasManyKeyAssociation", [
    "module:Modelling.Associations.HasManyKeyAssociation",
    "base:Objs"
], function(HasManyKeyAssociation, Objs, scoped) {
    return HasManyKeyAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(model, foreign_table, foreign_key, foreign_type_key, options) {
                inherited.constructor.call(this, model, foreign_table, foreign_key, options);
                this._foreign_type_key = foreign_type_key;
            },

            _buildQuery: function(query, options) {
                return Objs.extend({
                    "query": Objs.extend(Objs.objectBy(
                        this._foreign_key,
                        this._model.id(),
                        this._foreign_type_key,
                        this._model.type()
                    ), query)
                }, options);
            },

            _remove: function(item) {
                inherited._remove.call(this, item);
                item.set(this._foreign_type_key, null);
            },

            _add: function(item) {
                inherited._add.call(this, item);
                item.set(this._foreign_type_key, this._model.type());
            }

        };
    });
});
Scoped.define("module:Modelling.Associations.TableAssociation", [
    "module:Modelling.Associations.Association"
], function(Association, scoped) {
    return Association.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(model, foreign_table, foreign_key, options) {
                inherited.constructor.call(this, model, options);
                this._foreign_table = foreign_table;
                this._foreign_key = foreign_key;
            },

            _foreignTable: function() {
                return this._foreign_table;
            }

        };
    });
});
Scoped.define("module:Modelling.ModelException", [
    "base:Exceptions.Exception"
], function(Exception, scoped) {
    return Exception.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(model, message) {
                inherited.constructor.call(this, message);
                this.__model = model;
            },

            model: function() {
                return this.__model;
            }

        };
    });
});


Scoped.define("module:Modelling.ModelMissingIdException", [
    "module:Modelling.ModelException"
], function(Exception, scoped) {
    return Exception.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(model) {
                inherited.constructor.call(this, model, "No id given.");
            }

        };
    });
});


Scoped.define("module:Modelling.ModelInvalidException", [
    "module:Modelling.ModelException",
    "base:Objs"
], function(Exception, Objs, scoped) {
    return Exception.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(model, err) {
                var message = Objs.values(model.errors()).join("\n") || err;
                inherited.constructor.call(this, model, message);
            }

        };
    });
});
Scoped.define("module:Modelling.GroupedProperties", [
    "module:Modelling.AssociatedProperties",
    "base:Objs",
    "base:Types",
    "base:Collections.Collection"
], function(AssociatedProperties, Objs, Types, Collection, scoped) {
    return AssociatedProperties.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(attributes, collection) {
                inherited.constructor.call(this, attributes);

                var silent = false;
                var items = collection || this.auto_destroy(new Collection());
                this[this.cls.groupedItemsKey] = items;
                this.set(this.cls.groupedItemsCount, items.count());
                items.on("add remove", function() {
                    this.set(this.cls.groupedItemsCount, items.count());
                }, this);

                /* Methods */
                Objs.extend(this, Objs.map(this.cls.groupedMethods, function(methodFunc, methodKey) {
                    if (Types.is_string(methodFunc))
                        methodFunc = this.cls.methodsHelper[methodFunc];
                    return function() {
                        return methodFunc(items, methodKey, arguments);
                    };
                }, this));

                /* Setter */
                Objs.iter(this.cls.groupedSetters, function(setterFunc, attrKey) {
                    if (Types.is_string(setterFunc))
                        setterFunc = this.cls.settersHelper[setterFunc];
                    this.on("change:" + attrKey, function(attrValue) {
                        if (silent)
                            return;
                        setterFunc(items, attrKey, attrValue);
                    });
                }, this);

                /* Getter */
                Objs.iter(this.cls.groupedGetters, function(metaAttr, attrKey) {
                    if (Types.is_string(metaAttr)) {
                        if (!this.cls.gettersHelper[metaAttr]) {
                            console.warn("Unknown Getter: " + metaAttr);
                            return;
                        }
                        metaAttr = this.cls.gettersHelper[metaAttr];
                    }
                    var groupValue = null;
                    if (metaAttr.add) {
                        this.on("items:add", function(item) {
                            groupValue = metaAttr.add(groupValue, item.get(attrKey), item);
                            silent = true;
                            this.set(attrKey, metaAttr.map ? metaAttr.map(groupValue) : groupValue);
                            silent = false;
                        }, this);
                    }
                    if (metaAttr.remove) {
                        this.on("items:remove", function(item) {
                            groupValue = metaAttr.remove(groupValue, item.get(attrKey), item);
                            silent = true;
                            this.set(attrKey, metaAttr.map ? metaAttr.map(groupValue) : groupValue);
                            silent = false;
                        }, this);
                    }
                    if (metaAttr.update) {
                        items.on("change:" + attrKey, function(item, newValue, oldValue) {
                            groupValue = metaAttr.update(groupValue, newValue, oldValue, items.getIndex(item), items.count(), item);
                            silent = true;
                            this.set(attrKey, metaAttr.map ? metaAttr.map(groupValue) : groupValue);
                            silent = false;
                        }, this);
                    }
                    if (metaAttr.first) {
                        this.on("items:add items:reindexed", function(item) {
                            if (items.getIndex(item) === 0)
                                groupValue = metaAttr.first(groupValue, item.get(attrKey));
                            silent = true;
                            this.set(attrKey, metaAttr.map ? metaAttr.map(groupValue) : groupValue);
                            silent = false;
                        }, this);
                    }
                    if (metaAttr.last) {
                        this.on("items:add items:reindexed", function(item) {
                            if (items.getIndex(item) === items.count() - 1)
                                groupValue = metaAttr.last(groupValue, item.get(attrKey));
                            silent = true;
                            this.set(attrKey, metaAttr.map ? metaAttr.map(groupValue) : groupValue);
                            silent = false;
                        }, this);
                    }
                }, this);

                items.iterate(function(item) {
                    this.trigger("items:add", item);
                }, this);
                this.delegateEvents([
                    "add", "remove", "reindexed"
                ], items, "items");
            },

            destroy: function() {
                this[this.cls.groupedItemsKey].off(null, null, this);
                inherited.destroy.call(this);
            }

        };
    }, {

        groupedItemsKey: "items",
        groupedItemsCount: "count",

        groupedMethods: {},
        groupedSetters: {},
        groupedGetters: {},

        methodsHelper: {
            all: function(items, methodName, methodArgs) {
                var result = null;
                items.iterate(function(item) {
                    var itemResult = item[methodName].apply(item, methodArgs);
                    result = itemResult || result;
                });
                return result;
            },
            first: function(items, methodName, methodArgs) {
                var item = items.first();
                return item ? item[methodName].apply(item, methodArgs) : undefined;
            },
            last: function(items, methodName, methodArgs) {
                var item = items.last();
                return item ? item[methodName].apply(item, methodArgs) : undefined;
            }
        },

        settersHelper: {
            all: function(items, attrKey, attrValue) {
                items.iterate(function(item) {
                    item.set(attrKey, attrValue);
                });
            },
            first: function(items, attrKey, attrValue) {
                var item = items.first();
                if (item)
                    item.set(attrKey, attrValue);
            },
            last: function(items, attrKey, attrValue) {
                var item = items.last();
                if (item)
                    item.set(attrKey, attrValue);
            }
        },

        gettersHelper: {
            max: {
                add: function(groupValue, itemValue) {
                    return Math.max(groupValue || 0, itemValue || 0);
                },
                remove: function(groupValue, itemValue) {
                    return groupValue || 0;
                },
                update: function(groupValue, newItemValue, oldItemValue) {
                    return groupValue || 0;
                }
            },
            exists: {
                add: function(groupValue, itemValue) {
                    return (groupValue || 0) + (itemValue ? 1 : 0);
                },
                remove: function(groupValue, itemValue) {
                    return (groupValue || 0) - (itemValue ? 1 : 0);
                },
                update: function(groupValue, newItemValue, oldItemValue) {
                    return (groupValue || 0) - (oldItemValue ? 1 : 0) + (newItemValue ? 1 : 0);
                },
                map: function(groupValue) {
                    return !!groupValue;
                }
            },
            all: {
                add: function(groupValue, itemValue) {
                    return (groupValue || 0) + (itemValue ? 0 : 1);
                },
                remove: function(groupValue, itemValue) {
                    return (groupValue || 0) - (itemValue ? 0 : 1);
                },
                update: function(groupValue, newItemValue, oldItemValue) {
                    return (groupValue || 0) - (oldItemValue ? 0 : 1) + (newItemValue ? 0 : 1);
                },
                map: function(groupValue) {
                    return !groupValue;
                }
            },
            first: {
                first: function(groupValue, itemValue) {
                    return itemValue;
                },
                update: function(groupValue, newItemValue, oldItemValue, itemIndex) {
                    return itemIndex === 0 ? newItemValue : groupValue;
                }
            },
            last: {
                last: function(groupValue, itemValue) {
                    return itemValue;
                },
                update: function(groupValue, newItemValue, oldItemValue, itemIndex, itemCount) {
                    return itemIndex === itemCount - 1 ? newItemValue : groupValue;
                }
            },
            uniqueUnion: {
                add: function(groupValue, itemValue, item) {
                    var result = Objs.clone(groupValue || {}, 1);
                    if (!itemValue || !Types.is_array(itemValue))
                        itemValue = [];
                    itemValue.forEach(function(key) {
                        result[key] = result[key] || {};
                        result[key][item.cid()] = true;
                    });
                    return result;
                },
                remove: function(groupValue, itemValue, item) {
                    var result = Objs.clone(groupValue || {}, 1);
                    if (!itemValue || !Types.is_array(itemValue))
                        itemValue = [];
                    itemValue.forEach(function(key) {
                        if (result[key]) {
                            delete result[key][item.cid()];
                            if (Types.is_empty(result[key]))
                                delete result[key];
                        }
                    });
                    return result;
                },
                update: function(groupValue, newItemValue, oldItemValue, itemIndex, itemCount, item) {
                    var result = Objs.clone(groupValue || {}, 1);
                    (oldItemValue || []).forEach(function(key) {
                        if (result[key]) {
                            delete result[key][item.cid()];
                            if (Types.is_empty(result[key]))
                                delete result[key];
                        }
                    });
                    (newItemValue || []).forEach(function(key) {
                        result[key] = result[key] || {};
                        result[key][item.cid()] = true;
                    });
                    return result;
                },
                map: function(groupValue) {
                    return Objs.keys(groupValue);
                }
            }
        }

    });
});
Scoped.define("module:Modelling.Model", [
    "module:Modelling.AssociatedProperties",
    "base:Events.HooksMixin",
    "module:Modelling.ModelInvalidException",
    "base:Objs",
    "base:Promise",
    "base:Types",
    "base:Strings",
    "module:Modelling.Table"
], function(AssociatedProperties, HooksMixin, ModelInvalidException, Objs, Promise, Types, Strings, Table, scoped) {
    return AssociatedProperties.extend({
        scoped: scoped
    }, [HooksMixin, function(inherited) {
        return {

            constructor: function(attributes, table, options, ctx) {
                this.__table = table;
                this.__options = Objs.extend({
                    newModel: true,
                    removed: false,
                    canWeaklyRemove: false
                }, options);
                this.__ctx = ctx;
                this.__silent = 1;
                inherited.constructor.call(this, attributes);
                this.__silent = 0;
                this.__removeOnDestroy = false;
                if (!this.isNew()) {
                    this._properties_changed = {};
                    this._registerEvents();
                }
                if (this.option("auto_create") && this.isNew())
                    this.save();
                this.registerHook("beforeRemove", function() {
                    return BetaJS.Promise.value(true);
                });
                this.registerHook("beforeUpdate", function() {
                    return BetaJS.Promise.value(true);
                });
            },

            destroy: function() {
                if (this.__removeOnDestroy)
                    this.remove();
                if (this.__removeOnDestroyIfEmpty)
                    this.removeIfEmpty();
                if (this.table())
                    this.table().off(null, null, this);
                this.trigger("destroy");
                inherited.destroy.call(this);
            },

            ctx: function() {
                return this.__ctx;
            },

            saveOnChange: function(weak) {
                this.__saveOnChange = true;
                this.__saveOnChangeWeak = !!weak;
                return this;
            },

            disableSaveOnChange: function() {
                this.__disableSaveOnChange = true;
            },

            enableSaveOnChange: function() {
                this.__disableSaveOnChange = false;
            },

            option: function(key) {
                var opts = key in this.__options || !this.table() ? this.__options : this.table().options();
                return opts[key];
            },

            type: function() {
                return this.cls.type();
            },

            table: function() {
                return this.__table;
            },

            isSaved: function() {
                return this.isRemoved() || (!this.isNew() && !this.isChanged());
            },

            isNew: function() {
                return this.option("newModel");
            },

            isRemoved: function() {
                return this.option("removed");
            },

            setAllNoChange: function(data) {
                this.__silent++;
                for (var key in data) {
                    if (!this._properties_changed[key]) {
                        this.set(key, data[key]);
                        delete this._properties_changed[key];
                    }
                }
                this.__silent--;
            },

            _registerEvents: function() {
                if (!this.table().options().active_models)
                    return;
                this.__table.on("update:" + this.id(), function(data, row, pre_data) {
                    if (this.isRemoved())
                        return;
                    this.setAllNoChange(data);
                }, this);
                this.__table.on("remove:" + this.id(), function() {
                    if (this.isRemoved())
                        return;
                    this.__options.removed = true;
                    this.trigger("remove");
                }, this);
            },

            update: function(data) {
                this.__silent++;
                this.suspendEvents();
                this.setAll(data);
                this.__silent--;
                var promise = this.isNew() ? Promise.create(true) : this.save();
                return promise.callback(this.resumeEvents, this);
            },

            _afterSet: function(key, value, old_value, options) {
                inherited._afterSet.call(this, key, value, old_value, options);
                var scheme = this.cls.scheme();
                if (!(key in scheme) || this.__silent > 0)
                    return;
                if (this.option("auto_update") && (!this.isNew() || (!this.__disableSaveOnChange && this.__saveOnChange && (!this.__saveOnChangeWeak || !!value))))
                    this.save();
            },

            save: function(transaction_id) {
                if (this.isRemoved())
                    return Promise.create({});
                var promise = this.option("save_invalid") ? Promise.value(true) : this.validate();
                return promise.mapSuccess(function(valid) {
                    if (!valid)
                        return Promise.create(null, new ModelInvalidException(this));
                    var attrs;
                    if (this.isNew()) {
                        attrs = this.cls.filterPersistent(this.get_all_properties());
                        if (this.option("type_column")) {
                            var classname = this.cls.classname;
                            var column = this.option("type_column");
                            var type = this.get(column);
                            if (this.option("types") && typeof this.option("types") === "object") {
                                if (this.option("types")[type]) {
                                    classname = type;
                                } else {
                                    Objs.iter(Objs.values(this.option("types")), function(item) {
                                        if (this instanceof item)
                                            classname = item;
                                    }, this);
                                }
                            }
                            attrs[this.option("type_column")] = classname;
                        }
                    } else {
                        this.invokeHook("beforeUpdate");
                        attrs = this.cls.filterPersistent(this.properties_changed());
                        if (Types.is_empty(attrs))
                            return Promise.create(attrs);
                    }
                    var wasNew = this.isNew();
                    var promise = this.isNew() ? this.__table._insertModel(attrs, this.__ctx) : this.__table._updateModel(this.id(), attrs, this.__ctx, transaction_id);
                    return promise.mapCallback(function(err, result) {
                        if (this.destroyed())
                            return this;
                        if (err) {
                            if (err.data) {
                                Objs.iter(err.data, function(value, key) {
                                    this.setError(key, value);
                                }, this);
                            }
                            return new ModelInvalidException(this, err);
                        }
                        this.__silent++;
                        this.setAll(result);
                        this.__silent--;
                        this._properties_changed = {};
                        this.trigger("save");
                        if (wasNew) {
                            this.__options.newModel = false;
                            this._registerEvents();
                            this._createdModel();
                        }
                        return this;
                    }, this);
                }, this);
            },

            _createdModel: function() {},

            isRemoving: function() {
                return this.__removing;
            },

            canWeaklyRemove: function() {
                return this.option('can_weakly_remove');
            },

            weaklyRemove: function() {
                return this.canWeaklyRemove() ? this.remove() : Promise.error("Cannot remove weakly");
            },

            remove: function() {
                if (this.isNew() || this.isRemoved())
                    return Promise.create(true);
                this.__removing = true;
                this.invokeHook("beforeRemove");
                return this.__table.store().remove(this.id(), this.__ctx).callback(function() {
                    this.__removing = false;
                }, this).mapSuccess(function(result) {
                    if (this.destroyed())
                        return result;
                    this.__options.removed = true;
                    this.trigger("remove");
                    return this.invokeHook("remove", result);
                }, this);
            },

            removeOnDestroy: function() {
                this.__removeOnDestroy = true;
                return this;
            },

            removeIfEmpty: function() {
                if (this.isEmpty())
                    this.remove();
            },

            removeOnDestroyIfEmpty: function() {
                this.__removeOnDestroyIfEmpty = true;
                return this;
            },

            destroyOnRemove: function() {
                this.once("remove", this.weakDestroy, this);
                return this;
            }

        };
    }], {

        type: function() {
            return Strings.last_after(this.classname, ".").toLowerCase();
        },

        createTable: function(store, options) {
            return new Table(store, this, options);
        }

    });
});
Scoped.define("module:Modelling.SchemedProperties", [
    "base:Properties.Properties",
    "base:Types",
    "base:Promise",
    "base:Objs"
], function(Properties, Types, Promise, Objs, scoped) {
    return Properties.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(attributes) {
                inherited.constructor.call(this);
                var scheme = this.cls.scheme();
                this._properties_changed = {};
                this.__errors = {};
                for (var key in scheme)
                    this.set(key, this._defaultForKey(scheme[key], attributes));
                this._properties_changed = {};
                this.__errors = {};
                for (key in attributes)
                    this.set(key, attributes[key]);
            },

            _defaultForKey: function(schemeValue, attributes) {
                if ("def" in schemeValue)
                    return Types.is_function(schemeValue.def) ? schemeValue.def(attributes) : schemeValue.def;
                else if (schemeValue.auto_create)
                    return schemeValue.auto_create(this);
                return null;
            },

            _unsetChanged: function(key) {
                delete this._properties_changed[key];
            },

            _beforeSet: function(key, value, oldValue) {
                var scheme = this.cls.scheme();
                if (!(key in scheme))
                    return value;
                var sch = scheme[key];
                if (sch.type)
                    value = Types.parseType(value, sch.type);
                if (sch.transform)
                    value = sch.transform.call(this, value, oldValue);
                return value;
            },

            _afterSet: function(key, value) {
                var scheme = this.cls.scheme();
                if (!(key in scheme))
                    return;
                this._properties_changed[key] = value;
                delete this.__errors[key];
                if (scheme[key].after_set) {
                    var f = Types.is_string(scheme[key].after_set) ? this[scheme[key].after_set] : scheme[key].after_set;
                    f.apply(this, [value]);
                }
            },

            isChanged: function() {
                return !Types.is_empty(this._properties_changed);
            },

            properties_changed: function() {
                return this._properties_changed;
            },

            get_all_properties: function() {
                var result = {};
                var scheme = this.cls.scheme();
                for (var key in scheme)
                    result[key] = this.get(key);
                return result;
            },

            validate: function() {
                this.trigger("validate");
                var promises = [];
                for (var key in this.cls.scheme())
                    promises.push(this._validateAttr(key));
                promises.push(Promise.box(this._customValidate, this));
                return Promise.and(promises).end().mapSuccess(function(arr) {
                    var valid = true;
                    Objs.iter(arr, function(entry) {
                        valid = valid && entry;
                    });
                    return valid;
                });
            },

            _customValidate: function() {
                return true;
            },

            _validateAttr: function(attr) {
                delete this.__errors[attr];
                var scheme = this.cls.scheme();
                var entry = scheme[attr];
                var validate = entry.validate;
                if (!validate)
                    return Promise.value(true);
                if (!Types.is_array(validate))
                    validate = [validate];
                var value = this.get(attr);
                var promises = [];
                Objs.iter(validate, function(validator) {
                    promises.push(Promise.box(validator.validate, validator, [value, this, attr]));
                }, this);
                return Promise.and(promises).end().mapSuccess(function(arr) {
                    var valid = true;
                    Objs.iter(arr, function(entry) {
                        if (entry !== null) {
                            valid = false;
                            this.__errors[attr] = entry;
                        }
                    }, this);
                    this.trigger("validate:" + attr, valid, this.__errors[attr]);
                    return valid;
                }, this);
            },

            setError: function(attr, error) {
                this.__errors[attr] = error;
                this.trigger("validate:" + attr, !(attr in this.__errors), this.__errors[attr]);
            },

            errors: function() {
                return this.__errors;
            },

            getError: function(attr) {
                return this.__errors[attr];
            },

            asRecord: function(tags) {
                var rec = {};
                var scheme = this.cls.scheme();
                var props = this.get_all_properties();
                tags = tags || [];
                var asInner = function(key) {
                    var target = scheme[key].tags || [];
                    var tarobj = {};
                    Objs.iter(target, function(value) {
                        tarobj[value] = true;
                    });
                    var success = true;
                    Objs.iter(tags, function(x) {
                        success = success && x in tarobj;
                    }, this);
                    if (success)
                        rec[key] = props[key];
                };
                for (var key in props)
                    if (key in scheme)
                        asInner.call(this, key);
                return rec;
            },

            setByTags: function(data, tags) {
                var scheme = this.cls.scheme();
                tags = tags || {};
                var setInner = function(key) {
                    var target = scheme[key].tags || [];
                    var tarobj = {};
                    Objs.iter(target, function(value) {
                        tarobj[value] = true;
                    });
                    var success = true;
                    Objs.iter(tags, function(x) {
                        success = success && x in tarobj;
                    }, this);
                    if (success)
                        this.set(key, data[key]);
                };
                for (var key in data)
                    if (key in scheme)
                        setInner.call(this, key);
            },

            isEmpty: function() {
                var empty = true;
                var attrs = this.getAll();
                Objs.iter(this.cls.scheme(), function(value, key) {
                    empty = empty && (value.ignore_for_emptiness || this._defaultForKey(value, attrs) === attrs[key]);
                }, this);
                return empty;
            }

        };
    }, {

        _initializeScheme: function() {
            return {};
        },

        asRecords: function(arr, tags) {
            return arr.map(function(item) {
                return item.asRecord(tags);
            });
        },

        filterPersistent: function(obj) {
            var result = {};
            var scheme = this.scheme();
            for (var key in obj) {
                if ((!Types.is_defined(scheme[key].persistent) || scheme[key].persistent) && (Types.is_defined(obj[key])))
                    result[key] = obj[key];
            }
            return result;
        }

    }, {

        scheme: function() {
            this.__scheme = this.__scheme || this._initializeScheme();
            return this.__scheme;
        }

    });
});


Scoped.define("module:Modelling.AssociatedProperties", [
    "module:Modelling.SchemedProperties",
    "base:Objs"
], function(SchemedProperties, Objs, scoped) {
    return SchemedProperties.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(attributes) {
                inherited.constructor.call(this, attributes);
                this.assocs = this._initializeAssociations();
            },

            _initializeAssociations: function() {
                return {};
            },

            destroy: function() {
                Objs.iter(this.assocs, function(assoc) {
                    if (assoc && assoc.weakDestroy)
                        assoc.weakDestroy();
                });
                inherited.destroy.call(this);
            },

            id: function() {
                return this.get(this.cls.primary_key());
            },

            pid: function() {
                return this.id();
            },

            hasId: function() {
                return this.has(this.cls.primary_key()) && this.get(this.cls.primary_key()) !== null;
            }

        };

    }, {

        primary_key: function() {
            return "id";
        },

        _initializeScheme: function() {
            var s = {};
            s[this.primary_key()] = {
                type: "id",
                tags: ["read"],

                after_set: null,
                persistent: true,
                ignore_for_emptiness: true
            };
            return s;
        }

    });
});
Scoped.define("module:Modelling.Table", [
    "base:Class",
    "base:Events.EventsMixin",
    "base:Objs",
    "base:Types",
    "base:Iterators.MappedIterator",
    "base:Classes.ObjectCache",
    "base:Promise"
], function(Class, EventsMixin, Objs, Types, MappedIterator, ObjectCache, Promise, scoped) {
    return Class.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {
        return {

            constructor: function(store, model_type, options) {
                inherited.constructor.call(this);
                this.__store = store;
                this.__model_type = model_type;
                this.__options = Objs.extend({
                    // Attribute that describes the type
                    type_column: null,
                    // Object with the different types related to type_column
                    types: null,
                    // Creation options
                    auto_create: false,
                    // Update options
                    auto_update: true,
                    // Save invalid
                    save_invalid: false,
                    // Cache Models
                    cache_models: false,

                    can_weakly_remove: false,

                    oblivious_updates: false,
                    oblivious_inserts: false,

                    active_models: true,

                    id_generator: null,

                    keep_primary_keys: false
                }, options || {});
                this.__filteredInserts = {};
                this.__store.on("insert", function(obj) {
                    if (obj[this.primary_key()] in this.__filteredInserts) {
                        delete this.__filteredInserts[obj[this.primary_key()]];
                        return;
                    }
                    this.trigger("create", obj);
                }, this);
                this.__store.on("update", function(row, data, ctx, pre_data, transaction_id) {
                    var id = row[this.primary_key()];
                    this.trigger("update", id, data, row, pre_data, transaction_id);
                    this.trigger("update:" + id, data, row, pre_data, transaction_id);
                }, this);
                this.__store.on("remove", function(id, ctx, data) {
                    this.trigger("remove", id, ctx, data);
                    this.trigger("remove:" + id, ctx, data);
                }, this);
                if (this.__options.cache_models) {
                    this.model_cache = this.auto_destroy(new ObjectCache(function(model) {
                        return model.id();
                    }));
                }
            },

            modelClass: function(cls) {
                cls = cls || this.__model_type;
                if (this.__options.types && typeof this.__options.types === "object")
                    cls = this.__options.types[cls] || cls;
                return Types.is_string(cls) ? Scoped.getGlobal(cls) : cls;
            },

            newModel: function(attributes, cls, ctx) {
                if (!cls || typeof cls === "undefined")
                    cls = this.__options.type_column && attributes[this.__options.type_column] ? attributes[this.__options.type_column] : null;
                cls = this.modelClass(cls);
                var model = new cls(attributes, this, {}, ctx);
                if (this.__options.auto_create)
                    model.save();
                if (this.model_cache) {
                    if (model.hasId())
                        this.model_cache.register(model);
                    else {
                        model.once("save", function() {
                            this.model_cache.register(model);
                        }, this);
                    }
                }
                return model;
            },

            materialize: function(obj, ctx) {
                if (!obj)
                    return null;
                var cls = this.modelClass(this.__options.type_column && obj[this.__options.type_column] ? obj[this.__options.type_column] : null);
                if (this.model_cache) {
                    var cachedModel = this.model_cache.get(obj[this.primary_key()]);
                    if (cachedModel) {
                        cachedModel.setAll(obj);
                        return cachedModel;
                    }
                }
                var model = new cls(obj, this, {
                    newModel: false
                }, ctx);
                if (this.model_cache)
                    this.model_cache.register(model);
                return model;
            },

            options: function() {
                return this.__options;
            },

            store: function() {
                return this.__store;
            },

            findById: function(id, ctx) {
                return this.__store.get(id, ctx).mapSuccess(function(obj) {
                    return this.materialize(obj, ctx);
                }, this);
            },

            findByIdStrict: function(id, ctx) {
                return this.findById(id, ctx).mapSuccess(function(result) {
                    return result || Promise.error("Not found");
                });
            },

            findBy: function(query, options, ctx) {
                return this.allBy(query, Objs.extend({
                    limit: 1
                }, options), ctx).mapSuccess(function(iter) {
                    var item = iter.next();
                    iter.destroy();
                    return item;
                });
            },

            findByStrict: function(query, options, ctx) {
                return this.findBy(query, options, ctx).mapSuccess(function(result) {
                    return result || Promise.error("Not found");
                });
            },

            allBy: function(query, options, ctx) {
                return this.__store.query(query, options, ctx).mapSuccess(function(iterator) {
                    return (new MappedIterator(iterator, function(obj) {
                        return this.materialize(obj, ctx);
                    }, this)).auto_destroy(iterator, true);
                }, this);
            },

            primary_key: function() {
                return (Types.is_string(this.__model_type) ? Scoped.getGlobal(this.__model_type) : this.__model_type).primary_key();
            },

            all: function(options, ctx) {
                return this.allBy({}, options, ctx);
            },

            query: function() {
                // Alias
                return this.allBy.apply(this, arguments);
            },

            scheme: function() {
                return this.__model_type.scheme();
            },

            ensure_indices: function() {
                if (!("ensure_index" in this.__store))
                    return false;
                var scheme = this.scheme();
                for (var key in scheme) {
                    if (scheme[key].index)
                        this.__store.ensure_index(key);
                }
                return true;
            },

            _insertModel: function(attrs, ctx) {
                if (!this.__options.keep_primary_keys)
                    delete attrs[this.primary_key()];
                if (!this.__options.oblivious_inserts)
                    return this.store().insert(attrs, ctx);
                var id = this.__options.id_generator.generate();
                attrs[this.primary_key()] = id;
                this.__filteredInserts[id] = true;
                this.trigger("create", attrs);
                this.store().insert(attrs, ctx);
                return Promise.value(attrs);
            },

            _updateModel: function(id, attrs, ctx, transaction_id) {
                var promise = this.store().update(id, attrs, ctx, transaction_id);
                return this.__options.oblivious_updates ? Promise.value(attrs) : promise;
            }

        };
    }]);
});
Scoped.define("module:Modelling.Validators.ConditionalValidator", [
    "module:Modelling.Validators.Validator",
    "base:Types"
], function(Validator, Types, scoped) {
    return Validator.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(condition, validator) {
                inherited.constructor.call(this);
                this.__condition = condition;
                this.__validator = Types.is_array(validator) ? validator : [validator];
            },

            validate: function(value, context) {
                if (!this.__condition(value, context))
                    return null;
                for (var i = 0; i < this.__validator.length; ++i) {
                    var result = this.__validator[i].validate(value, context);
                    if (result !== null)
                        return result;
                }
                return null;
            }

        };
    });
});
Scoped.define("module:Modelling.Validators.EmailValidator", [
    "module:Modelling.Validators.Validator",
    "base:Strings"
], function(Validator, Strings, scoped) {
    return Validator.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(error_string) {
                inherited.constructor.call(this);
                this.__error_string = error_string ? error_string : "Not a valid email address";
            },

            validate: function(value, context) {
                return Strings.is_email_address(value) ? null : this.__error_string;
            }

        };
    });
});
Scoped.define("module:Modelling.Validators.LengthValidator", [
    "module:Modelling.Validators.Validator",
    "base:Types",
    "base:Objs"
], function(Validator, Types, Objs, scoped) {
    return Validator.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(options) {
                inherited.constructor.call(this);
                options = Objs.extend({
                    min_length: null,
                    max_length: null,
                    error_string: null,
                    max_action: null
                }, options);
                this.__min_length = options.min_length;
                this.__max_length = options.max_length;
                this.__error_string = options.error_string;
                this.__max_action = options.max_action;
                if (!this.__error_string) {
                    if (this.__min_length !== null) {
                        if (this.__max_length !== null)
                            this.__error_string = "Between " + this.__min_length + " and " + this.__max_length + " characters";
                        else
                            this.__error_string = "At least " + this.__min_length + " characters";
                    } else if (this.__max_length !== null)
                        this.__error_string = "At most " + this.__max_length + " characters";
                }
            },

            validate: function(value, context, key) {
                if (this.__min_length !== null && (!value || (value && value.length < this.__min_length)))
                    return this.__error_string;
                var resp = null;
                if (this.__max_length !== null && (value && (value.length > this.__max_length))) {
                    resp = this.__error_string;
                    if (this.__max_action) {
                        switch (this.__max_action) {
                            case "truncate":
                                context.set(key, value.substr(0, this.__max_length));
                                resp = null;
                                break;
                            case "empty":
                                context.set(key, "");
                                resp = null;
                                break;
                            default:
                                break;
                        }
                    }
                }
                return resp;
            }

        };
    });
});
Scoped.define('module:Modelling.Validators.MinMaxValidator', [
    'module:Modelling.Validators.Validator',
    'base:Types',
    'base:Objs'
], function(Validator, Types, Objs, scoped) {
    return Validator.extend({
        scoped: scoped
    }, function(inherited) {
        return {
            constructor: function(options) {
                inherited.constructor.call(this);
                options = Objs.extend({
                    min_value: null,
                    max_value: null,
                    error_string: null
                }, options);
                if (options.min_value && !Types.isNumber(options.min_value))
                    throw new Error('Min value must be a number.');
                if (options.max_value && !Types.isNumber(options.max_value))
                    throw new Error('Max value must be a number.');
                this.__min_value = options.min_value;
                this.__max_value = options.max_value;
                this.__error_string = options.error_string;
                if (!this.__error_string) {
                    if (this.__min_value !== null) {
                        if (this.__max_value !== null) {
                            this.__error_string = 'Between ' + this.__min_value + ' and ' + this.__max_value;
                        } else {
                            this.__error_string = 'At least ' + this.__min_value;
                        }
                    } else if (this.__max_value !== null)
                        this.__error_string = 'At most ' + this.__max_value;
                }
            },

            validate: function(value, context, key) {
                if (!Types.isNumber(value))
                    throw new Error('MinMax Validator is for numbers only.');
                if (this.__min_value !== null && (!value || (value < this.__min_value))) {
                    return this.__error_string;
                }
                if (this.__max_value !== null && (value && (value > this.__max_value))) {
                    return this.__error_string;
                }
                return null;
            }
        };
    });
});
Scoped.define("module:Modelling.Validators.PresentValidator", [
    "module:Modelling.Validators.Validator",
    "base:Types"
], function(Validator, Types, scoped) {
    return Validator.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(error_string) {
                inherited.constructor.call(this);
                this.__error_string = error_string ? error_string : "Field is required";
            },

            validate: function(value, context) {
                return Types.is_null(value) || value === "" ? this.__error_string : null;
            }

        };
    });
});
Scoped.define("module:Modelling.Validators.RegexValidator", [
    "module:Modelling.Validators.Validator",
    "base:Strings"
], function(Validator, Strings, scoped) {
    return Validator.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(options) {
                inherited.constructor.call(this);
                this.__regex = options.regex ? new RegExp(options.regex) : null;
                this.__function = options.use_function ? options.use_function : "test";
                this.__error_string = options.error_string ? options.error_string : "String doesn't match regular expression.";
            },

            validate: function(value, context) {
                if (!this.__regex)
                    return "You must add a regex to use this validator.";
                if (["test", "match"].indexOf(this.__function) === -1)
                    return "You must choose between 'test' and 'match' to validate the regex.";
                if (this.__function === "test")
                    return this.__regex.test(value) ? null : this.__error_string;
                if (this.__function === "match")
                    return value.match(this.__regex) ? null : this.__error_string;
                return this.__error_string;
            }

        };
    });
});
Scoped.define("module:Modelling.Validators.UniqueValidator", [
    "module:Modelling.Validators.Validator"
], function(Validator, scoped) {
    return Validator.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(key, error_string, ignore_if_null, query) {
                inherited.constructor.call(this);
                this.__key = key;
                this.__error_string = error_string ? error_string : "Key already present";
                this.__ignore_if_null = ignore_if_null;
                this.__query = query;
            },

            validate: function(value, context) {
                if (value == null && this.__ignore_if_null)
                    return null;
                var query = {};
                query[this.__key] = value;
                if (this.__query && Array.isArray(this.__query)) {
                    this.__query.forEach(function(element) {
                        if (element !== this.__key)
                            query[element] = context.get(element);
                    }, this);
                }
                return context.table().findBy(query).mapSuccess(function(item) {
                    return (!item || (!context.isNew() && context.id() == item.id())) ? null : this.__error_string;
                }, this);
            }

        };
    });
});
Scoped.define("module:Modelling.Validators.Validator", [
    "base:Class"
], function(Class, scoped) {
    return Class.extend({
        scoped: scoped
    }, {

        validate: function(value, context) {
            return null;
        }

    });
});
Scoped.define("module:Modelling.Validators.ValueValidator", [
    "module:Modelling.Validators.Validator",
    "base:Types"
], function(Validator, Types, scoped) {
    return Validator.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(values) {
                inherited.constructor.call(this);
                this.__values = values;
            },

            validate: function(value, context) {
                if (this.__values.indexOf(value) < 0)
                    return null;
                return null;
            }
        };
    });
});
}).call(Scoped);