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
        "base:Promise"
    ], function (Collection, Objs, Types, Promise, scoped) {
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
				this._source = source;
				inherited.constructor.call(this, options);
				this._options = Objs.extend({
					forward_steps: null,
					backward_steps: null,
					range: null
				}, options);
				if (query !== null)
					this.set_query(query);
			},
			
      /**
       * @method query
       *
       * Getter method to access the query method.
       *
       * @return {object} The query object.
       */
			query: function () {
				return this._query;
			},
			
      /**
       * @method set_query
       *
       * Update the collection with a new query. Setting the query not only
       * updates the query field, but also updates the data with the results of
       * the new query.
       *
       * @param {object} query The new query for this collection.
       *
       * @example
       * // Updates the query dictating the collection contents.
       * collectionQuery.set_query('queryField': 'queryValue');
       */
			set_query: function (query) {
				this._query = Objs.extend({
					query: {},
					options: {}
				}, query);
				this._query.options.skip = this._query.options.skip || 0;
				this._query.options.limit = this._query.options.limit || null;
				this._query.options.sort = this._query.options.sort || {};  
				this._count = 0;
				return this.__execute_query(this._query.options.skip, this._query.options.limit, true);
			},
			
      /**
       * @method __sub_query
       *
       * Run the specified query on the data source.
       *
       * @private
       *
       * @param {object} options The options for the subquery.
       *
       * @return {object} Iteratable object containing query results.
       */
			__sub_query: function (options) {
				return this._source.query(this._query.query, options);
			},
			
      /**
       * @method __execute_query
       *
       * Execute a query. This method is called whenever a new query is set.
       *
       * @private
       *
       * @param {int} skip The number data entires to skip.
       * @param {int} limit The maximum number of data entries to return.
       * @param {boolean} clear_before Flag indicating if results from the
       * previous query should be cleared before adding the new results.
       *
       * @return {Promise} Promise from executing query.
       */
			__execute_query: function (skip, limit, clear_before) {
				skip = Math.max(skip, 0);
				var q = {};
				if (this._query.options.sort && !Types.is_empty(this._query.options.sort))
					q.sort = this._query.options.sort;
				if (clear_before) {
					if (skip > 0)
						q.skip = skip;
					if (limit !== null)
						q.limit = limit;
					return this.__sub_query(q).mapSuccess(function (iter) {
						var objs = iter.asArray();
						this._query.options.skip = skip;
						this._query.options.limit = limit;
						this._count = !limit || objs.length < limit ? skip + objs.length : null;
						this.clear();
						this.add_objects(objs);
						return true;
					}, this);
				} else if (skip < this._query.options.skip) {
					limit = this._query.options.skip - skip;
					if (skip > 0)
						q.skip = skip;
					q.limit = limit;
					return this.__sub_query(q).mapSuccess(function (iter) {
						var objs = iter.asArray();
						this._query.options.skip = skip;
						var added = this.add_objects(objs);
						this._query.options.limit = this._query.options.limit === null ? null : this._query.options.limit + added;
						return true;
					}, this);
				} else if (skip >= this._query.options.skip) {
					if (this._query.options.limit !== null && (!limit || skip + limit > this._query.options.skip + this._query.options.limit)) {
						limit = (skip + limit) - (this._query.options.skip + this._query.options.limit);
						skip = this._query.options.skip + this._query.options.limit;
						if (skip > 0)
							q.skip = skip;
						if (limit)
							q.limit = limit;
						return this.__sub_query(q).mapSuccess(function (iter) {
							var objs = iter.asArray();
							var added = this.add_objects(objs);
							this._query.options.limit = this._query.options.limit + added;
							if (limit > objs.length)
								this._count = skip + added;
							return true;
						}, this);
					} else
						return Promise.create(true);
				}
			},
			
			increase_forwards: function (steps) {
				steps = !steps ? this._options.forward_steps : steps;
				if (!steps || this._query.options.limit === null)
					return Promise.create(true);
				return this.__execute_query(this._query.options.skip + this._query.options.limit, steps, false);
			},
			
			increase_backwards: function (steps) {
				steps = !steps ? this._options.backward_steps : steps;
				if (steps && this._query.options.skip > 0) {
					steps = Math.min(steps, this._query.options.skip);
					return this.__execute_query(this._query.options.skip - steps, steps, false);
				} else
					return Promise.create(true);
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
				return this.__execute_query(this._options.range * index, this._options.range, true);
			},
			
      /**
       * @method paginate_index
       *
       * @return {int} Current pagination page.
       */
			paginate_index: function () {
				return !this._options.range ? null : Math.floor(this._query.options.skip / this._options.range);
			},
			
      /**
       * @method paginate_count
       *
       * @return {int} The total number of possible pages given the data
       * contained in the current query.
       */
			paginate_count: function () {
				return !this._count || !this._options.range ? null : Math.ceil(this._count / this._options.range);
			},
			
      /**
       * @method next
       *
       * Update the query to paginate to the next page.
       *
       * @return {Promise} Promise of the query.
       */
			next: function () {
				var paginate_index = this.paginate_index();
				if (!paginate_index)
					return Promise.create(true);
				var paginate_count = this.paginate_count();
				if (!paginate_count || paginate_index < this.paginate_count() - 1)
					return this.paginate(paginate_index + 1);
				return Promise.create(true);
			},
			
      /**
       * @method prev
       *
       * Update the query to paginate to the previous page.
       *
       * @return {Promise} Promise of the query.
       */
			prev: function () {
				var paginate_index = this.paginate_index();
				if (!paginate_index)
					return Promise.create(true);
				if (paginate_index > 0)
					this.paginate(paginate_index - 1);
				return Promise.create(true);
			},
			
      /**
       * @method isComplete
       *
       * @return {boolean} Return value indicates if the query has finished/if
       * data has been returned.
       */
			isComplete: function () {
				return this._count !== null;
			}			
			
    	};
	});
});
	

Scoped.define("module:Collections.ActiveQueryCollection", [      
         "module:Collections.QueryCollection",
         "module:Queries",
         "base:Objs"
     ], function (QueryCollection, Queries, Objs, scoped) {
     return QueryCollection.extend({scoped: scoped}, function (inherited) {
 		return {
 			
			isValid: function (data) {
				return Queries.evaluate(this.query().query, data);
			},
			
 			_materialize: function (data) {
 				return data;
 			},
			
			_activeCreate: function (data) {
				if (!this.isValid(data))
					return;
				this.add(this._materialize(data));
				this._count = this._count + 1;
				if (this._query.options.limit !== null)
					this._query.options.limit = this._query.options.limit + 1;
			},
			
			_activeRemove: function (id) {
				var object = this.getById(id);
				if (!object)
					return;
				this.remove(object);
				this._count = this._count - 1;
				if (this._query.options.limit !== null)
					this._query.options.limit = this._query.options.limit - 1;
			},
			
			_activeUpdate: function (id, data, row) {
				var object = this.getById(id);
				var merged = Objs.extend(row, data);
				if (!object)
					this._activeCreate(merged, this._materialize(merged));
				else if (!this.isValid(merged))
					this._activeRemove(id);
				else
					object.setAll(data);
			}

		};
    });
});


Scoped.define("module:Collections.ActiveTableQueryCollection", [      
       "module:Collections.ActiveQueryCollection"
   ], function (ActiveQueryCollection, scoped) {
   return ActiveQueryCollection.extend({scoped: scoped}, function (inherited) {
		return {
	                                           			
			constructor: function (source, query, options) {
				inherited.constructor.call(this, source, query, options);
				source.on("create", this._activeCreate, this);
				source.on("remove", this._activeRemove, this);
				source.on("update", this._activeUpdate, this);
	  		},
	  			
			destroy: function () {
				this._source.off(null, null, this);
				inherited.destroy.call(this);
			},
	  			
			get_ident: function (obj) {
				return obj.id();
			},
	  			
			_materialize: function (data) {
				return this._source.materialize(data);
			}

  		};
      });
  });


/**
 * @class ActiveStoreQueryCollection
 *
 * @augments QueryCollection
 */
Scoped.define("module:Collections.ActiveStoreQueryCollection", [      
        "module:Collections.ActiveQueryCollection"
    ], function (ActiveQueryCollection, scoped) {
    return ActiveQueryCollection.extend({scoped: scoped}, function (inherited) {
 		return {
 	                                           			
      /**
       * @inheritdoc
       */
 			constructor: function (source, query, options) {
 				inherited.constructor.call(this, source, query, options);
 				source.on("insert", this._activeCreate, this);
 				source.on("remove", this._activeRemove, this);
 				source.on("update", function (row, data) {
 					this._activeUpdate(source.id_of(row), data, row);
 				}, this);
 	  		},
 	  			
 			destroy: function () {
 				this._source.off(null, null, this);
 				inherited.destroy.call(this);
 			},
 	  			
 			get_ident: function (obj) {
 				return obj.get(this._source.id_key());
 			}

   		};
       });
   });
