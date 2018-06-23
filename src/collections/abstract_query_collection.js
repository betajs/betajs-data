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
                else if (!this.isValid(merged))
                    this._activeRemove(id);
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