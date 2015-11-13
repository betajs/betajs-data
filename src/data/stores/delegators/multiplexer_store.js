Scoped.define("module:Stores.MultiplexerStore", [
                                                 "module:Stores.BaseStore",
                                                 "module:Queries.Constrained",
                                                 "base:Promise"
                                                 ], function (BaseStore, Constrained, Promise, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (options) {
				inherited.constructor.call(this, options);
				this.__context = options.context || this;
				this.__acquireStore = options.acquireStore;
				this.__releaseStore = options.releaseStore;
				this.__mapContext = options.mapContext;
			},
			
			_acquireStore: function (ctx) {
				return Promise.value(this.__acquireStore ? this.__acquireStore.call(this.__context, ctx) : ctx);
			},
			
			_releaseStore: function (ctx, store) {
				if (this.__releaseStore)
					this.__releaseStore.call(this.__context, ctx, store);
			},
			
			_mapContext: function (ctx) {
				return this.__mapContext ? this.__mapContext.call(this.__context, ctx) : null;
			},

			_query_capabilities: function () {
				return Constrained.fullConstrainedQueryCapabilities();
			},

			_insert: function (data, ctx) {
				return this._acquireStore(ctx).mapSuccess(function (store) {
					return store.insert(data, this._mapContext(ctx)).callback(function () {
						this._releaseStore(ctx, store);
					}, this);
				}, this);
			},
			
			_remove: function (id, ctx) {
				return this._acquireStore(ctx).mapSuccess(function (store) {
					return store.remove(id, this._mapContext(ctx)).callback(function () {
						this._releaseStore(ctx, store);
					}, this);
				}, this);
			},

			_update: function (id, data, ctx) {
				return this._acquireStore(ctx).mapSuccess(function (store) {
					return store.update(id, data, this._mapContext(ctx)).callback(function () {
						this._releaseStore(ctx, store);
					}, this);
				}, this);
			},

			_get: function (id, ctx) {
				return this._acquireStore(ctx).mapSuccess(function (store) {
					return store.get(id, this._mapContext(ctx)).callback(function () {
						this._releaseStore(ctx, store);
					}, this);
				}, this);
			},
			
			_query: function (query, options, ctx) {
				return this._acquireStore(ctx).mapSuccess(function (store) {
					return store.query(query, options, this._mapContext(ctx)).callback(function () {
						this._releaseStore(ctx, store);
					}, this);
				}, this);
			}

		};
	});
});
