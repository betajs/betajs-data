/**
 * @class QueryCollection
 *
 * A base class for querying collections. Subclasses specify the expected type
 * of data store and specify whether the query collection is active.
 */
Scoped.define("module:Collections.QueryCollection", [      
                                                     "base:Collections.Collection",
                                                     "base:Objs",
                                                     "base:Types",
                                                     "base:Comparators",
                                                     "base:Promise",
                                                     "base:Class",
                                                     "module:Queries.Constrained",
                                                     "module:Queries"
                                                     ], function (Collection, Objs, Types, Comparators, Promise, Class, Constrained, Queries, scoped) {
	return Collection.extend({scoped: scoped}, function (inherited) {
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
			constructor: function (source, query, options) {
				inherited.constructor.call(this);
				options = options || {};
				this._id_key = this._id_key || options.id_key || "id";
				this._source = source;
				this._complete = false;
				this._active = options.active || false;
				this._incremental = "incremental" in options ? options.incremental : true; 
				this._active_bounds = "active_bounds" in options ? options.active_bounds : true;
				this._enabled = false;
				this._range = options.range || null;
				this._forward_steps = options.forward_steps || null;
				this._backward_steps = options.backward_steps || null;
				this._query = {
					query: {},
					options: {
						skip: 0,
						limit: null,
						sort: null
					}
				};
				this._watched = null;
				query = query || {};
				this.update(query.query ? query : {
					query: query,
					options: {
						skip: options.skip || 0,
						limit: options.limit || options.range || null,
						sort: options.sort || null
					}
				});
				if (options.auto)
					this.enable();
			},

			destroy: function () {
				this.disable();
				inherited.destroy.call(this);
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
			
			paginate: function (index) {
				return this.update({options: {
					skip: index * this._range,
					limit: this._range
				}});
			},
			
		      /**
		       * @method paginate_index
		       *
		       * @return {int} Current pagination page.
		       */
			paginate_index: function () {
				return Math.floor(this.getSkip() / this._range);
			},
			
		      /**
		       * @method paginate_next
		       *
		       * Update the query to paginate to the next page.
		       *
		       * @return {Promise} Promise of the query.
		       */
			paginate_next: function () {
				return this.isComplete() ? Promise.create(true) : this.paginate(this.paginate_index() + 1);
			},
			
	      /**
	       * @method paginate_prev
	       *
	       * Update the query to paginate to the previous page.
	       *
	       * @return {Promise} Promise of the query.
	       */
			paginate_prev: function () {
				return this.paginate_index() > 0 ? this.paginate(this.paginate_index() - 1) : Promise.create(true);
			},		
			
			increase_forwards: function (steps) {
				steps = steps || this._forward_steps;
				return this.isComplete() ? Promise.create(true) : this.update({options: {
					limit: this.getLimit() + steps
				}});
			},

			increase_backwards: function (steps) {
				steps = steps || this._backward_steps;
				return !this.getSkip() ? Promise.create(true) : this.update({options: {
					skip: Math.max(this.getSkip() - steps, 0),
					limit: this.getLimit() ? this.getLimit() + this.getSkip() - Math.max(this.getSkip() - steps, 0) : null  
				}});
			},
			

			get_ident: function (obj) {
				return Class.is_class_instance(obj) ? obj.get(this._id_key) : obj[this._id_key];
			},

			getQuery: function () {
				return this._query;
			},

			getSkip: function () {
				return this._query.options.skip || 0;
			},

			getLimit: function () {
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
			update: function (constrainedQuery) {
				constrainedQuery = Constrained.rectify(constrainedQuery);
				var currentSkip = this._query.options.skip || 0;
				var currentLimit = this._query.options.limit || null;
				if (constrainedQuery.query)
					this._query.query = constrainedQuery.query;
				this._query.options = Objs.extend(this._query.options, constrainedQuery.options);
				if (!this._enabled)
					return Promise.create(true);
				if (constrainedQuery.query || "sort" in constrainedQuery.options || !this._incremental)					
					return this.refresh();
				var nextSkip = "skip" in constrainedQuery.options ? constrainedQuery.options.skip || 0 : currentSkip;
				var nextLimit = "limit" in constrainedQuery.options ? constrainedQuery.options.limit || null : currentLimit;
				if (nextSkip === currentSkip && nextLimit === currentLimit)
					return Promise.create(true);
				// No overlap
				if ((nextLimit && nextSkip + nextLimit <= currentSkip) || (currentLimit && currentSkip + currentLimit <= nextSkip))
					return this.refresh();
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
					promise = this._execute(Objs.tree_extend({options: {
						skip: nextSkip,
						limit: leftLimit    
					}}, this._query, 2));
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
				return promise.and(this._execute(Objs.tree_extend({
					options: {
						skip: currentSkip + currentLimit,
						limit: !nextLimit ? null : nextLimit - currentLimit
					}
				}, this._query, 2)));
			},

			enable: function () {
				if (this._enabled)
					return;
				this._enabled = true;
				this.refresh();
			},

			disable: function () {
				if (!this._enabled)
					return;
				this._enabled = false;
				this.clear();
				if (this._watched) {
					this._unwatchQuery(this._watched);
					this._watched = null;
				}
			},

			refresh: function (clear) {
				if (clear)
					this.clear();
				if (this._query.options.sort && !Types.is_empty(this._query.options.sort))
					this.set_compare(Comparators.byObject(this._query.options.sort));
				else
					this.set_compare(null);
				if (this._watched) {
					this._unwatchQuery(this._watched);
					this._watched = null;
				}
				if (this._active) {
					this._watched = this._query.query;
					this._watchQuery(this._watched);
				}
				return this._execute(this._query);
			},

			isEnabled: function () {
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
			_execute: function (constrainedQuery) {
				var limit = constrainedQuery.options.limit;
				return this._subExecute(constrainedQuery.query, constrainedQuery.options).mapSuccess(function (iter) {
					var result = iter.asArray();
					this._complete = limit === null || result.length < limit;
					this.replace_objects(result);
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
			_subExecute: function (query, options) {
				return this._source.query(query, options);
			},

		      /**
		       * @method isComplete
		       *
		       * @return {boolean} Return value indicates if the query has finished/if
		       * data has been returned.
		       */
			isComplete: function () {
				return this._complete;
			},

			_watchQuery: function (query) {},

			_unwatchQuery: function () {},

			isValid: function (data) {
				return Queries.evaluate(this._query.query, data);
			},

			_materialize: function (data) {
				return data;
			},

			_activeCreate: function (data) {
				if (!this._active || !this._enabled)
					return;
				if (!this.isValid(data))
					return;
				this.add(this._materialize(data));
				if (this._query.options.limit && this.count() > this._query.options.limit) {
					if (this._active_bounds)
						this._query.options.limit++;
					else
						this.remove(this.getByIndex(this.count() - 1));
				}
			},

			_activeRemove: function (id) {
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

			_activeUpdate: function (id, data, row) {
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
			}


		};
	});
});



