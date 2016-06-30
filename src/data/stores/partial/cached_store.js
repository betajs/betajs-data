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
				this._options = Objs.extend({
					itemMetaKey: "meta",
					queryMetaKey: "meta",
					queryKey: "query",
					cacheKey: null,
					suppAttrs: {},
					optimisticRead: false
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

			_insert: function (data) {
				return this.cacheInsert(data, {
					lockItem: true,
					silent: true,
					refreshMeta: false,
					accessMeta: true
				});
			},

			_update: function (id, data) {
				return this.cacheUpdate(id, data, {
					ignoreLock: false,
					silent: true,
					lockAttrs: true,
					refreshMeta: false,
					accessMeta: true
				});
			},

			_remove: function (id) {
				return this.cacheRemove(id, {
					ignoreLock: true,
					silent: true
				});
			},

			_get: function (id) {
				return this.cacheGet(id, {
					silentInsert: true,
					silentUpdate: true,
					silentRemove: true,
					refreshMeta: true,
					accessMeta: true
				});
			},

			_query: function (query, options) {
				return this.cacheQuery(query, options, {
					silent: true,
					queryRefreshMeta: true,
					queryAccessMeta: true,
					refreshMeta: true,
					accessMeta: true
				});
			},

			/*
			 * options:
			 *   - lockItem: boolean
			 *   - silent: boolean
			 *   - refreshMeta: boolean
			 *   - accessMeta: boolean
			 */

			cacheInsert: function (data, options) {
				var meta = {
					lockedItem: options.lockItem,
					lockedAttrs: {},
					refreshMeta: options.refreshMeta ? this.cacheStrategy.itemRefreshMeta() : null,
					accessMeta: options.accessMeta ? this.cacheStrategy.itemAccessMeta() : null
				};
				return this.itemCache.insert(this.addItemSupp(this.addItemMeta(data, meta))).mapSuccess(function (result) {
					data = this.removeItemMeta(result);
					if (!options.silent)
						this._inserted(data);
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

			cacheUpdate: function (id, data, options) {
				var foreignKey = options.foreignKey && this._foreignKey;
				var itemPromise = foreignKey ?
					              this.itemCache.getBy(this.remoteStore.id_key(), id)
					            : this.itemCache.get(id);
				return itemPromise.mapSuccess(function (item) {
					if (!item)
						return null;
					var meta = this.readItemMeta(item);
					if (options.unlockItem) {
						meta.lockedItem = false;
						meta.lockedAttrs = {};
					}
					data = Objs.filter(data, function (value, key) {
						return options.ignoreLock || (!meta.lockedItem && !meta.lockedAttrs[key]);
					}, this);
					if (Types.is_empty(data))
						return this.removeItemMeta(item);
					if (options.lockAttrs) {
						Objs.iter(data, function (value, key) {
							meta.lockedAttrs[key] = true;
						}, this);
					}
					if (options.refreshMeta)
						meta.refreshMeta = this.cacheStrategy.itemRefreshMeta(meta.refreshMeta);
					if (options.accessMeta)
						meta.accessMeta = this.cacheStrategy.itemAccessMeta(meta.accessMeta);
					return this.itemCache.update(this.itemCache.id_of(item), this.addItemMeta(data, meta)).mapSuccess(function (result) {
						result = this.removeItemMeta(result);
						if (!options.silent)
							this._updated(result, data);
						return result;
					}, this);
				}, this);
			},

			cacheInsertUpdate: function (data, options) {
				var foreignKey = options.foreignKey && this._foreignKey;
				var itemPromise = foreignKey ?
					              this.itemCache.getBy(this.remoteStore.id_key(), this.remoteStore.id_of(data))
					            : this.itemCache.get(this.itemCache.id_of(data));
				return itemPromise.mapSuccess(function (item) {
					options.foreignKey = false;
					return item ? this.cacheUpdate(this.itemCache.id_of(item), data, options) : this.cacheInsert(data, options);
				}, this);
			},

			/*
			 * options:
			 *   - ignoreLock: boolean
			 *   - silent: boolean
			 *   - foreignKey: boolean
			 */
			cacheRemove: function (id, options) {
				var foreignKey = options.foreignKey && this._foreignKey;
				var itemPromise = foreignKey ?
					  this.itemCache.getBy(this.remoteStore.id_key(), id)
					: this.itemCache.get(id);
				return itemPromise.mapSuccess(function (data) {
					if (!data)
						return data;
					var meta = this.readItemMeta(data);
					if (!options.ignoreLock && (meta.lockedItem || !Types.is_empty(meta.lockedAttrs)))
						return Promise.error("locked item");
					var cached_id = this.itemCache.id_of(data);
					return this.itemCache.remove(cached_id).success(function () {
						if (!options.silent)
							this._removed(cached_id);
					}, this);
				}, this);
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
			cacheGet: function (id, options) {
				var foreignKey = options.foreignKey && this._foreignKey;
				var itemPromise = foreignKey ?
					  this.itemCache.getBy(this.remoteStore.id_key(), id)
					: this.itemCache.get(id);
				return itemPromise.mapSuccess(function (data) {
					if (!data) {
						if (!foreignKey && this._foreignKey)
							return data;
						return this.remoteStore.get(id).mapSuccess(function (data) {
							this.online();
							if (data) {
								return this.cacheInsert(data, {
									lockItem: false,
									silent: options.silentInsert,
									accessMeta: true,
									refreshMeta: true
								});
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
							this.itemCache.update(cached_id, this.addItemMeta({}, meta));
						}
						return this.removeItemMeta(data);
					}
					return this.remoteStore.get(remote_id).mapSuccess(function (data) {
						this.online();
						if (data) {
							return this.cacheUpdate(cached_id, data, {
								ignoreLock: false,
								lockAttrs: false,
								silent: options.silentUpdate,
								accessMeta: true,
								refreshMeta: true
							});
						} else {
							return this.cacheRemove(cached_id, {
								ignoreLock: false,
								silent: options.silentRemove
							});
						}
					}, this).mapError(function () {
						this.offline();
						return Promise.value(data);
					}, this);
				}, this);
			},
			
			__itemCacheQuery: function (query, options) {
				return this.itemCache.query(query, options).mapSuccess(function (items) {
					items = items.asArray();
					Objs.iter(items, function (item) {
						this.cacheUpdate(this.itemCache.id_of(item), {}, {
							lockItem: false,
							lockAttrs: false,
							silent: true,
							accessMeta: options.accessMeta,
							refreshMeta: false
						});
					}, this);
					return new MappedIterator(new ArrayIterator(items), this.removeItemMeta, this);
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
			cacheQuery: function (query, queryOptions, options) {
				var queryString = Constrained.serialize({
					query: query,
					options: queryOptions
				});
				var localQuery = Objs.objectBy(
					this._options.queryKey,
					queryString
				);
				return this.queryCache.query(localQuery, {limit : 1}).mapSuccess(function (result) {
					result = result.hasNext() ? result.next() : null;
					if (result) {
						var meta = this.readQueryMeta(result);
						var query_id = this.queryCache.id_of(result);
						if (this.cacheStrategy.validQueryRefreshMeta(meta.refreshMeta)) {
							if (options.queryAccessMeta) {
								meta.accessMeta = this.cacheStrategy.queryAccessMeta(meta.accessMeta);
								this.queryCache.update(query_id, this.addQueryMeta({}, meta));
							}
							return this.__itemCacheQuery(query, options);
						}
						this.queryCache.remove(query_id);
					}
					// Note: This is probably not good enough in the most general cases.
					if (Queries.queryDeterminedByAttrs(query, this._options.suppAttrs))
						return this.itemCache.query(query, options);
					var remotePromise = this.remoteStore.query(query, queryOptions).mapSuccess(function (items) {
						this.online();
						items = items.asArray();
						var meta = {
							refreshMeta: options.queryRefreshMeta ? this.cacheStrategy.queryRefreshMeta() : null,
							accessMeta: options.queryAccessMeta ? this.cacheStrategy.queryAccessMeta() : null
						};
						this.queryCache.insert(Objs.objectBy(
							this._options.queryKey, queryString,
							this._options.queryMetaKey, meta
						));
						var promises = [];
						Objs.iter(items, function (item) {
							promises.push(this.cacheInsertUpdate(item, {
								lockItem: false,
								lockAttrs: false,
								silent: options.silent && !this._options.optimisticRead,
								accessMeta: options.accessMeta,
								refreshMeta: options.refreshMeta,
								foreignKey: true
							}));
						}, this);
						return Promise.and(promises).mapSuccess(function (items) {
							return new MappedIterator(new ArrayIterator(items), this.addItemSupp, this);
						}, this);
					}, this).mapError(function () {
						this.offline();
						if (!this._options.optimisticRead) {
							return this.__itemCacheQuery(query, options);
						}
					}, this);
					return this._options.optimisticRead ? this.__itemCacheQuery(query, options) : remotePromise;
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

			unlockItem: function (id) {
				this.itemCache.get(id).success(function (data) {
					if (!data)
						return;
					var meta = this.readItemMeta(data);
					meta.lockedItem = false;
					meta.lockedAttrs = {};
					this.itemCache.update(id, this.addItemMeta({}, meta));
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
				}, this);
				this.itemCache.query().success(function (items) {
					while (items.hasNext()) {
						var item = items.next();
						var meta = this.readItemMeta(item);
						if (!meta.lockedItem && Types.is_empty(meta.lockedAttrs) &&
							(!this.cacheStrategy.validItemRefreshMeta(meta.refreshMeta) || !this.cacheStrategy.validItemAccessMeta(meta.accessMeta)))
							this.itemCache.remove(this.itemCache.id_of(item));
					}
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
				return this.itemCache.unserialize(data.items).mapSuccess(function () {
					return this.queryCache.unserialize(data.queries);
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