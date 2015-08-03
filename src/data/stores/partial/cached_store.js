
Scoped.define("module:Stores.CachedStore", [
                                            "module:Stores.BaseStore",
                                            "module:Stores.MemoryStore",
                                            "module:Queries.Constrained",
                                            "module:Stores.CacheStrategies.ExpiryCacheStrategy",
                                            "base:Promise",
                                            "base:Objs",
                                            "base:Types",
                                            "base:Iterators.ArrayIterator",
                                            "base:Iterators.MappedIterator",
                                            "base:Timers.Timer"
                                            ], function (Store, MemoryStore, Constrained, ExpiryCacheStrategy, Promise, Objs, Types, ArrayIterator, MappedIterator, Timer, scoped) {
	return Store.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (remoteStore, options) {
				inherited.constructor.call(this);
				this._options = Objs.extend({
					itemMetaKey: "meta",
					queryMetaKey: "meta",
					queryKey: "query"
				}, options);
				this.remoteStore = remoteStore;
				this._online = true;
				this.itemCache = this._options.itemCache || this.auto_destroy(new MemoryStore({					
					id_key: remoteStore.id_key()
				}));
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
				return this.itemCache.insert(this.addItemMeta(data, meta)).mapSuccess(function (result) {
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
			 */

			cacheUpdate: function (id, data, options) {
				return this.itemCache.get(id).mapSuccess(function (item) {
					if (!item)
						return null;
					var meta = this.readItemMeta(item);
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
					return this.itemCache.update(id, this.addItemMeta(data, meta)).mapSuccess(function (result) {
						result = this.removeItemMeta(result);
						if (!options.silent)
							this._updated(result, data);
						return result;
					}, this);					
				}, this);
			},

			cacheInsertUpdate: function (data, options) {
				var id = data[this.remoteStore.id_key()];
				return this.itemCache.get(id).mapSuccess(function (item) {
					return item ? this.cacheUpdate(id, data, options) : this.cacheInsert(data, options);
				}, this);
			},

			/*
			 * options:
			 *   - ignoreLock: boolean
			 *   - silent: boolean
			 */
			cacheRemove: function (id, options) {
				return this.itemCache.get(id).mapSuccess(function (data) {
					if (!data)
						return data;
					var meta = this.readItemMeta(data);
					if (!options.ignoreLock && (meta.lockedItem || !Types.is_empty(meta.lockedAttrs)))
						return Promise.error("locked item");
					return this.itemCache.remove(id).success(function () {
						if (!options.silent)
							this._removed(id);
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
			 */
			cacheGet: function (id, options) {
				return this.itemCache.get(id).mapSuccess(function (data) {
					if (!data) {
						return this.remoteStore.get(id).success(function (data) {
							this.online();
							if (data) {
								this.cacheInsert(data, {
									lockItem: false,
									silent: options.silentInsert,
									accessMeta: true,
									refreshMeta: true
								});
							}
						}, this);
					}
					var meta = this.readItemMeta(data);
					if (this.cacheStrategy.validItemRefreshMeta(meta.refreshMeta) || meta.lockedItem) {
						if (options.accessMeta) {
							meta.accessMeta = this.cacheStrategy.itemAccessMeta(meta.accessMeta);
							this.itemCache.update(id, this.addItemMeta({}, meta));
						}
						return this.removeItemMeta(data);
					}
					return this.remoteStore.get(id).success(function (data) {
						this.online();
						if (data) {
							this.cacheUpdate(id, data, {
								ignoreLock: false,
								lockAttrs: false,
								silent: options.silentUpdate,
								accessMeta: true,
								refreshMeta: true
							});
						} else {
							this.cacheRemove(id, {
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
						}
						this.queryCache.remove(query_id);
					}
					return this.remoteStore.query(query, queryOptions).mapSuccess(function (items) {
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
						Objs.iter(items, function (item) {
							this.cacheInsertUpdate(item, {
								lockItem: false,
								lockAttrs: false,
								silent: options.silent,
								accessMeta: options.accessMeta,
								refreshMeta: options.refreshMeta
							});
						}, this);
						return new ArrayIterator(items);
					}, this).mapError(function () {
						this.offline();
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
					}, this);
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
				return refreshMeta ? refreshMeta : this._options.now() + this._options.itemRefreshTime; 
			},

			queryRefreshMeta: function (refreshMeta) {
				return refreshMeta ? refreshMeta : this._options.now() + this._options.queryRefreshTime; 
			},

			itemAccessMeta: function (accessMeta) {
				return this._options.now() + this._options.itemAccessTime; 
			},

			queryAccessMeta: function (accessMeta) {
				return this._options.now() + this._options.queryAccessTime; 
			},

			validItemRefreshMeta: function (refreshMeta) {
				return refreshMeta >= this._options.now();
			},

			validQueryRefreshMeta: function (refreshMeta) {
				return refreshMeta >= this._options.now();
			},	

			validItemAccessMeta: function (accessMeta) {
				return accessMeta >= this._options.now();
			},

			validQueryAccessMeta: function (accessMeta) {
				return accessMeta >= this._options.now();
			}

		};
	});	
});