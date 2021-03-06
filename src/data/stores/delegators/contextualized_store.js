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
