Scoped.define("module:Stores.PartialStore", [
          "module:Stores.BaseStore",
          "module:Stores.MemoryStore",
          "module:Stores.PartialStoreWriteStrategies.PostWriteStrategy",
          "module:Queries",
          "module:Queries.Constrained",
          "module:Stores.ActiveReadStoreMixin",
          "base:Promise",
          "base:Objs",
          "base:Time",
          "base:Timers.Timer",
          "base:Iterators.ArrayIterator",
          "base:Iterators.MappedIterator"
  	], function (Store, MemoryStore, PostWriteStrategy, Queries, Constrained, ActiveReadStoreMixin, Promise, Objs, Time, Timer, ArrayIterator, MappedIterator, scoped) {
  	return Store.extend({scoped: scoped}, [ActiveReadStoreMixin, function (inherited) {			
  		return {

			constructor: function (options, remoteStore, localItemStore, localQueryStore, writeStrategy) {
				this._options = Objs.extend({
					meta_key: "meta",
					meta_query_key: "meta",
					query_key: "query",
					update_time: 10 * 60 * 1000,
					remove_time: 24 * 60 * 60 * 1000,
					query_update_time: 10 * 60 * 1000,
					query_remove_time: 24 * 60 * 60 * 1000
				}, options);
				inherited.constructor.call(this, options);
				this.remoteStore = remoteStore;
				this.localItemStore = localItemStore || this.auto_destroy(new MemoryStore());
				this.localQueryStore = localQueryStore || this.auto_destroy(new MemoryStore());
				this.writeStrategy = writeStrategy || this.auto_destroy(new PostWriteStrategy());
				this.auto_destroy(new Timer({
					delay: Math.min(this._options.remove_time, this._options.query_remove_time),
					context: this,
					fire: this.cleanup
				}));
			},
			
			_addMeta: function (data, options) {
  				var meta_key = this._options.meta_key;
  				var now = Time.now();
  				var copyData = Objs.clone(data, 1);
  				copyData[meta_key] = Objs.extend({
					update_time: now + this._options.update_time,
					remove_time: now + this._options.remove_time,
					locked: false
  				}, options);
  				return copyData;
			},
			
			_removeMeta: function (data) {
  				var meta_key = this._options.meta_key;
  				var copyData = Objs.clone(data, 1);
  				delete copyData[meta_key];
  				return copyData;
			},
			
			_inserted: function (row, event_data) {
				var meta_key = this._options.meta_key;
				row = Objs.clone(row, 1);
				delete row[meta_key];
				inherited._inserted.call(this, row, event_data);		
			},
			
			_updated: function (row, data, event_data) {
				var meta_key = this._options.meta_key;
				row = Objs.clone(row, 1);
				delete row[meta_key];
				data = Objs.clone(data, 1);
				delete data[meta_key];
				inherited._updated.call(this, row, data, event_data);		
			},
			
			_insert: function (data) {
				return this.writeStrategy.insert(this, data);
			},
			
			_remove: function (id) {
				return this.writeStrategy.remove(this, id);
			},
			
			_update: function (id, data) {
				return this.writeStrategy.update(this, id, data);
			},

			_get: function (id) {
				var now = Time.now();
				var meta_key = this._options.meta_key;
				var localItem = Objs.clone(this.localItemStore.get(id).value(), 1);
				if (localItem) {
					var meta = localItem[meta_key];
					delete localItem[meta_key];
					if (meta.update_time > now || meta.locked) {
						meta.remove_time = now + this._options.remove_time;
						this.localItemStore.update(id, Objs.objectBy(meta_key, meta));
						return Promise.value(localItem);
					}
				}
				return this.remoteStore.get(id).mapSuccess(function (remoteItem) {
					this.localItemStore.remove(id);
					if (remoteItem) {
						localItem = Objs.clone(remoteItem, 1);
						localItem[meta_key] = {
							update_time: now + this._options.update_time,
							remove_time: now + this._options.remove_time
						};
						this.localItemStore.insert(localItem);
					}
					return remoteItem;
				}, this).mapError(function (err) {
					if (localItem)
						return Promise.value(localItem);
					return Promise.error(error);
				}, this);
			},
			
			_query: function (query, options) {
				var now = Time.now();
				var queryString = Constrained.serialize({
					query: query,
					options: options
				});
				var meta_key = this._options.meta_query_key;
				var item_meta_key = this._options.meta_key;
				var query_key = this._options.query_key;
				var localQuery = this.localQueryStore.query({query: queryString}, {limit: 1}).value().asArray();
				localQuery = localQuery.length > 0 ? Objs.clone(localQuery[0], 1) : null;
				var query_id = null;
				if (localQuery) {
					query_id = localQuery[this.localQueryStore.id_key()];
					var meta = localQuery[meta_key];
					delete localQuery[meta_key];
					if (meta.update_time > now) {
						meta.remove_time = now + this._options.query_remove_time;
						this.localQueryStore.update(query_id, Objs.objectBy(meta_key, meta));
						return Promise.value(new MappedIterator(this.localItemStore.query(query, options).value(), function (item) {
							var result = Objs.clone(item, 1);
							delete result[item_meta_key];
							return result;
						}));
					}
				}
				return this.remoteStore.query(query, options).mapSuccess(function (remoteQuery) {
					if (localQuery)
						this.localQueryStore.remove(query_id);
					this.localQueryStore.insert(Objs.objectBy(meta_key, {
						update_time: now + this._options.query_update_time,
						remove_time: now + this._options.query_remove_time
					}, query_key, queryString));
					var arr = remoteQuery.asArray();
					Objs.iter(arr, function (remoteItem, i) {
						var id = this.remoteStore.id_of(remoteItem);
						var localItem = this.localItemStore.get(id).value();
						if (localItem) {
							if (localItem[meta_key].locked)
								return;
							this.localItemStore.remove(id);
						}
						localItem = Objs.clone(remoteItem, 1);
						localItem[meta_key] = {
							update_time: now + this._options.update_time,
							remove_time: now + this._options.remove_time
						};
						this.localItemStore.insert(localItem);
						this._inserted(localItem);
					}, this);
					return new ArrayIterator(arr);
				}, this).mapError(function (err) {
					return Promise.value(new MappedIterator(this.localItemStore.query(query, options).value(), function (item) {
						var result = Objs.clone(item, 1);
						delete result[item_meta_key];
						return result;
					}));
				}, this);
			},			
			
			_query_capabilities: function () {
				return Constrained.fullConstrainedQueryCapabilities();
			},
			
			invalidateQuery: function (constrainedQuery) {
				var queryString = Constrained.serialize(constrainedQuery);
				var localQuery = this.localQueryStore.query({query: queryString}, {limit: 1}).value().asArray();
				if (localQuery.length > 0)
					this.localQueryStore.remove(this.localQueryStore.id_of(localQuery));
			},
			
			cleanup: function () {
				var now = Time.now();
				var iter = this.localItemStore.query({}).value();
				var meta_key = this._options.meta_key;
				while (iter.hasNext()) {
					var item = iter.next();
					var meta = item[meta_key];
					if (meta.remove_time < now && !meta.locked)
						this.localItemStore.remove(item[this.localItemStore.id_key()]);
				}
				iter = this.localQueryStore.query({}).value();
				meta_key = this._options.meta_query_key;
				while (iter.hasNext()) {
					var item2 = iter.next();
					var meta2 = item2[meta_key];
					if (meta2.remove_time < now)
						this.localQueryStore.remove(item2[this.localQueryStore.id_key()]);
				}
			},
			
			registerQuery: function (constrainedQuery, context) {
				if (this.activeReadStrategy)
					this.activeReadStrategy.registerQuery(constrainedQuery, context);
			},
			
			unregisterQuery: function (constrainedQuery, context) {
				if (this.activeReadStrategy)
					this.activeReadStrategy.unregisterQuery(constrainedQuery, context);
			}
			
  		
		};
	}]);
});
   