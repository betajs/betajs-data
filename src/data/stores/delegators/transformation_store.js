
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
			
			_encodeId: function (id) {
				return this.id_of(this._encodeData(Objs.objectBy(this.id_key(), id)));
			},
			
			_decodeId: function (id) {
				return this.id_of(this._decodeData(Objs.objectBy(this.id_key(), id)));
			},
			
			_encodeQuery: function (query, options) {
				var opts = Objs.clone(options);
				if (opts.sort)
					opts.sort = Types.is_object(opts.sort) ? this._encodeData(opts.sort) : {};
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
				return Promise.create(new MappedIterator(results, function (data) {
					return this._decodeData(data);
				}, this));
			}

		};
	});
});
