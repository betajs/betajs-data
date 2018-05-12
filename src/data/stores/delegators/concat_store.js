
Scoped.define("module:Stores.ConcatStore", [
    "module:Stores.BaseStore"
], function (BaseStore, scoped) {
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
				c = c || {};
				return this._primary().query(q, c, ctx).mapSuccess(function (result) {
					result = result.asArray();
					if (c.limit && result.length >= c.limit)
						return result;
					if (c.limit)
						c.limit -= result.length;
					return this._secondary().query(q, c, ctx).mapSuccess(function (result2) {
						return result.concat(result2.asArray());
					}, this);
				}, this);
			},

			_primary: function () {
				return this.__primary;
			},

            _secondary: function () {
                return this.__secondary;
            }


		};
	});
});

