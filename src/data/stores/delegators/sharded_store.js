Scoped.define("module:Stores.ShardedStore", [
	"module:Stores.BaseStore",
	"module:Queries.Constrained",
	"module:Stores.ConcatStore"
], function (BaseStore, Constrained, ConcatStore, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (options) {
				inherited.constructor.call(this, options);
				this.__context = options.context || this;
				this.__shardSelector = options.shardSelector;
			},
			
			_selectShards: function (data, ctx, countExpected) {
				var shards = this.__shardSelector.call(this.__context, data, ctx);
				if (countExpected !== undefined && shards.length !== countExpected)
					throw "Count of shards do not match.";
				return shards;
			},

			_selectSingleShard: function (data, ctx) {
				return (this._selectShards(data, ctx, 1))[0];
			},

			_selectShardById: function (id, ctx) {
				return this._selectSingleShard(this.id_row(id), ctx);
			},

			_query_capabilities: function () {
				return Constrained.fullConstrainedQueryCapabilities();
			},

			_insert: function (data, ctx) {
				return this._selectSingleShard(data, ctx).insert(data, ctx);
			},
			
			_remove: function (id, ctx) {
				return this._selectShardById(id, ctx).remove(id, ctx);
			},

			_get: function (id, ctx) {
				return this._selectShardById(id, ctx).get(id, ctx);
			},

			_update: function (id, data, ctx) {
				return this._selectShardById(id, ctx).update(id, data, ctx);
			},

			_query: function (query, options, ctx) {
				return ConcatStore.queryOnMultipleStores(this._selectShards(query, ctx), query, options, ctx);
			}

		};
	});
});
