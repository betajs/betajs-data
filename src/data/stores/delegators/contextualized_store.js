Scoped.define("module:Stores.ContextualizedStore", [
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
				this.__store.update(decoded.id, data, decoded.ctx).mapSuccess(function (row) {
					return row;
				}, this);
			},

			_query: function (query, options) {
				var decoded = this._decode(query);
				return this.__store.query(decoded.data, options, decoded.ctx).mapSuccess(function (results) {
					return new MappedIterator(results, function (row) {
						return this._encode(row, decoded.ctx);
					}, this);
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



Scoped.define("module:Stores.DecontextualizedSelectStore", [
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
   			
   			_decode: function (data, ctx) {
   				data = Objs.clone(data, 1);
   				Objs.iter(ctx, function (value, key) {
   					delete data[key];
   				});
   				return data;
   			},
   			
   			_encode: function (data, ctx) {
   				return Objs.extend(Objs.clone(data, 1), ctx);
   			},
   			
   			_query_capabilities: function () {
   				return this.__store._query_capabilities();
   			},

   			_insert: function (data, ctx) {
   				return this.__store.insert(this._encode(data, ctx)).mapSuccess(function (data) {
   					return this._decode(data, ctx);
   				}, this);
   			},

   			_query: function (query, options, ctx) {
   				return this.__store.query(this._encode(query, ctx), options).mapSuccess(function (results) {
   					return new MappedIterator(results, function (row) {
   						return this._decode(row, ctx);
   					}, this);
   				}, this);
   			},

   			_ensure_index: function (key) {
   				return this.__store.ensure_index(key);
   			},

   			_store: function () {
   				return this.__store;
   			},

   			_get: function (id, ctx) {
   				return this.query(this.id_row(id), {limit: 1}, ctx).mapSuccess(function (rows) {
   					if (!rows.hasNext())
   						return null;
   					return this._decode(rows.next(), ctx);
   				}, this);
   			},

   			_remove: function (id, ctx) {
   				return this.query(this.id_row(id), {limit: 1}, ctx).mapSuccess(function (rows) {
   					if (!rows.hasNext())
   						return null;
   					return this.__store.remove(this.__store.id_of(this._decode(rows.next(), ctx)));
   				}, this);
   			},

   			_update: function (id, data, ctx) {
   				return this.query(this.id_row(id), {limit: 1}, ctx).mapSuccess(function (rows) {
   					if (!rows.hasNext())
   						return null;
   					return this.__store.update(this.__store.id_of(this._decode(rows.next(), ctx)), data);
   				}, this);
   			}

   		};
   	});
});
