
Scoped.define("module:Stores.ConcatStore", [
    "module:Stores.BaseStore",
	"base:Promise",
	"base:Comparators",
	"base:Iterators.SkipIterator",
	"base:Iterators.LimitIterator",
	"base:Iterators.SortedOrIterator",
	"base:Iterators.ConcatIterator",
	"base:Iterators.ArrayIterator"
], function (BaseStore, Promise, Comparators, SkipIterator, LimitIterator, SortedOrIterator, ConcatIterator, ArrayIterator, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (primary, secondary, options) {
				this.__primary = primary;
				this.__secondary = secondary;
				inherited.constructor.call(this, options);
			},

			_query_capabilities: function () {
				return this._primary()._query_capabilities();
			},

            _count: function () {
				return this._primary().count.apply(this._primary(), arguments).and(this._secondary().count.apply(this._secondary(), arguments)).mapSuccess(function (counts) {
					return counts[0] + counts[1];
				});
            },

			_insert: function () {
				var args = arguments;
				return this._primary().insert.apply(this._primary(), args).mapError(function () {
					return this._secondary().insert.apply(this._secondary(), args);
				}, this);
			},

			_remove: function () {
                var args = arguments;
                return this._primary().remove.apply(this._primary(), args).mapError(function () {
                    return this._secondary().remove.apply(this._secondary(), args);
                }, this);
			},

			_get: function () {
                var args = arguments;
                return this._primary().get.apply(this._primary(), args).mapCallback(function (error, model) {
                    return model || this._secondary().get.apply(this._secondary(), args);
                }, this);
			},

			_update: function () {
                var args = arguments;
                return this._primary().update.apply(this._primary(), args).mapError(function () {
                    return this._secondary().update.apply(this._secondary(), args);
                }, this);
			},

			_query: function (q, c, ctx) {
				return this.cls.queryOnMultipleStores([this._primary(), this._secondary()], q, c, ctx);
			},

			_primary: function () {
				return this.__primary;
			},

            _secondary: function () {
                return this.__secondary;
            }

		};
	}, {

		queryOnMultipleStores: function (stores, query, options, ctx) {
			if (stores.length === 0)
				return [];
			if (stores.length === 1)
				return stores[0].query(query, options, ctx);
			options = options || {};
			var postLimit = options.limit;
			var postSkip = options.skip;
			if (options.skip) {
				delete options.skip;
				if (options.limit)
					options.limit += postSkip;
			}
			return Promise.and(stores.map(function (store) {
				return store.query(query, options, ctx);
			})).mapSuccess(function (iterators) {
				var iterator = options.sort ? new SortedOrIterator(iterators, Comparators.byObject(options.sort))
					         : new ConcatIterator(new ArrayIterator(iterators));
				if (postSkip)
					iterator = new SkipIterator(iterator, postSkip);
				if (postLimit)
					iterator = new LimitIterator(iterator, postLimit);
				return iterator;
			});
		}

	});
});

