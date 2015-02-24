Scoped.define("module:Collections.QueryCollection", [      
        "base:Collections.Collection",
        "base:Objs",
        "base:Types",
        "base:Promise"
    ], function (Collection, Objs, Types, Promise, scoped) {
    return Collection.extend({scoped: scoped}, function (inherited) {
		return {
			
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
			
			query: function () {
				return this._query;
			},
			
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
			
			__sub_query: function (options) {
				return this._source.query(this._query.query, options);
			},
			
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
			
			paginate: function (index) {
				return this.__execute_query(this._options.range * index, this._options.range, true);
			},
			
			paginate_index: function () {
				return !this._options.range ? null : Math.floor(this._query.options.skip / this._options.range);
			},
			
			paginate_count: function () {
				return !this._count || !this._options.range ? null : Math.ceil(this._count / this._options.range);
			},
			
			next: function () {
				var paginate_index = this.paginate_index();
				if (!paginate_index)
					return Promise.create(true);
				var paginate_count = this.paginate_count();
				if (!paginate_count || paginate_index < this.paginate_count() - 1)
					return this.paginate(paginate_index + 1);
				return Promise.create(true);
			},
			
			prev: function () {
				var paginate_index = this.paginate_index();
				if (!paginate_index)
					return Promise.create(true);
				if (paginate_index > 0)
					this.paginate(paginate_index - 1);
				return Promise.create(true);
			},
			
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
                                             			
			constructor: function (source, query, options) {
				inherited.constructor.call(this, source, query, options);
				source.on("create", this.__active_create, this);
				source.on("remove", this.__active_remove, this);
				source.on("update", this.__active_update, this);
			},
			
			destroy: function () {
				this._source.off(null, null, this);
				inherited.destroy.call(this);
			},
			
			get_ident: function (obj) {
				return obj.id();
			},
			
			is_valid: function (data) {
				return Queries.evaluate(this.query().query, data);
			},
			
			__active_create: function (data, materialize) {
				if (!this.is_valid(data))
					return;
				var obj = materialize();
				this.add(obj);
				this._count = this._count + 1;
				if (this._query.options.limit !== null)
					this._query.options.limit = this._query.options.limit + 1;
			},
			
			__active_remove: function (id) {
				var object = this.getById(id);
				if (!object)
					return;
				this.remove(object);
				this._count = this._count - 1;
				if (this._query.options.limit !== null)
					this._query.options.limit = this._query.options.limit - 1;
			},
			
			__active_update: function (id, data, row) {
				var object = this.getById(id);
				var merged = Objs.extend(row, data);
				if (!object)
					this.__active_create(merged, this._source.materializer(merged));
				else if (!this.is_valid(merged))
					this.__active_remove(id);
			}

		};
    });
});
