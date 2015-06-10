
Scoped.define("module:Stores.DualStore", [
                                          "module:Queries",
                                          "module:Queries.Constrained",
                                          "module:Stores.BaseStore",
                                          "base:Objs",
                                          "base:Iterators.ArrayIterator"
                                          ], function (Queries, Constrained, BaseStore, Objs, ArrayIterator, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (first, second, options) {
				options = Objs.extend({
					create_options: {},
					update_options: {},
					delete_options: {},
					get_options: {},
					query_options: {}
				}, options || {});
				options.id_key = first._id_key;
				this.__first = first;
				this.__second = second;
				inherited.constructor.call(this, options);
				this.__create_options = Objs.extend({
					start: "first", // "second"
					strategy: "then", // "or", "single"
					auto_replicate: "first" // "first", "second", "both", "none"
				}, options.create_options);
				this.__update_options = Objs.extend({
					start: "first", // "second"
					strategy: "then", // "or", "single"
					auto_replicate: "first" // "first", "second", "both", "none"
				}, options.update_options);
				this.__remove_options = Objs.extend({
					start: "first", // "second"
					strategy: "then", // "or", "single",
					auto_replicate: "first" // "first", "second", "both", "none"
				}, options.delete_options);
				this.__get_options = Objs.extend({
					start: "first", // "second"
					strategy: "or", // "single"
					clone: true, // false
					clone_second: false,
					or_on_null: true // false
				}, options.get_options);
				this.__query_options = Objs.extend({
					start: "first", // "second"
					strategy: "or", // "single"
					clone: true, // false
					clone_second: false,
					or_on_null: true // false
				}, options.query_options);
				this.__first.on("insert", this.__inserted_first, this);
				this.__second.on("insert", this.__inserted_second, this);
				this.__first.on("update", this.__updated_first, this);
				this.__second.on("update", this.__updated_second, this);
				this.__first.on("remove", this.__removed_first, this);
				this.__second.on("remove", this.__removed_second, this);
			},

			__inserted_first: function (row, event_data) {
				if (event_data && event_data.dual_insert)
					return;
				if (this.__create_options.auto_replicate == "first" || this.__create_options.auto_replicate == "both")
					this.__second.insert([row, {dual_insert: true}]);
				this._inserted(row);
			},

			__inserted_second: function (row, event_data) {
				if (event_data && event_data.dual_insert)
					return;
				if (this.__create_options.auto_replicate == "second" || this.__create_options.auto_replicate == "both")
					this.__first.insert([row, {dual_insert: true}]);
				this._inserted(row);
			},

			__updated_first: function (row, update, event_data) {
				if (event_data && event_data.dual_update)
					return;
				if (this.__update_options.auto_replicate == "first" || this.__update_options.auto_replicate == "both")
					this.__second.update(row[this.id_key()], [update, {dual_update: true}]);
				this._updated(row, update);
			},

			__updated_second: function (row, update, event_data) {
				if (event_data && event_data.dual_update)
					return;
				if (this.__update_options.auto_replicate == "second" || this.__update_options.auto_replicate == "both")
					this.__first.update(row[this.id_key()], [update, {dual_update: true}]);
				this._updated(row, update);
			},

			__removed_first: function (id, event_data) {
				if (event_data && event_data.dual_remove)
					return;
				if (this.__remove_options.auto_replicate == "first" || this.__remove_options.auto_replicate == "both")
					this.__second.remove([id, {dual_remove: true}]);
				this._removed(id);
			},

			__removed_second: function (id, event_data) {
				if (event_data && event_data.dual_remove)
					return;
				if (this.__remove_options.auto_replicate == "second" || this.__remove_options.auto_replicate == "both")
					this.__first.remove([id, {dual_remove: true}]);
				this._removed(id);
			},

			first: function () {
				return this.__first;
			},

			second: function () {
				return this.__second;
			},

			_insert: function (data) {
				var first = this.__first;
				var second = this.__second;
				if (this.__create_options.start != "first") {
					first = this.__second;
					second = this.__first;
				}
				var strategy = this.__create_options.strategy;
				if (strategy == "then")
					return first.insert([data, {dual_insert: true}]).mapSuccess(function (row) {
						return second.insert([row, {dual_insert: true}]);
					}, this);
				else if (strategy == "or")
					return first.insert([data, {dual_insert: true}]).mapError(function () {
						return second.insert([data, {dual_insert: true}]);
					}, this);
				else
					return first.insert([data, {dual_insert: true}]);
			},

			_update: function (id, data) {
				var first = this.__first;
				var second = this.__second;
				if (this.__update_options.start != "first") {
					first = this.__second;
					second = this.__first;
				}
				var strategy = this.__update_options.strategy;
				if (strategy == "then")
					return first.update(id, [data, {dual_update: true}]).mapSuccess(function (row) {
						return second.update(id, [row, {dual_update: true}]);
					}, this);
				else if (strategy == "or")
					return first.update(id, [data, {dual_update: true}]).mapError(function () {
						return second.update(id, [data, {dual_update: true}]);
					}, this);
				else
					return first.update(id, [data, {dual_update: true}]);
			},

			_remove: function (id) {
				var first = this.__first;
				var second = this.__second;
				if (this.__remove_options.start != "first") {
					first = this.__second;
					second = this.__first;
				}
				var strategy = this.__remove_options.strategy;
				if (strategy == "then")
					return first.remove([id, {dual_remove: true}]).mapSuccess(function () {
						return second.remove([id, {dual_remove: true}]);
					}, this);
				else if (strategy == "or")
					return first.remove([id, {dual_remove: true}]).mapError(function () {
						return second.remove([id, {dual_remove: true}]);
					}, this);
				else
					return first.remove(id);
			},

			_query_capabilities: function () {
				return Constrained.fullConstrainedQueryCapabilities(Queries.fullQueryCapabilities()); 
			},

			_get: function (id) {
				var first = this.__first;
				var second = this.__second;
				if (this.__get_options.start != "first") {
					first = this.__second;
					second = this.__first;
				}
				var strategy = this.__get_options.strategy;
				var clone = this.__get_options.clone;
				var clone_second = this.__get_options.clone_second;
				var or_on_null = this.__get_options.or_on_null;
				var result = null;
				if (strategy == "or") {
					return first.get(id).mapCallback(function (error, result) {
						if (error || (!result && or_on_null))
							return second.get(id).mapSuccess(function (result) {
								return result && clone ? first.insert(result) : result;
							}, this);
						if (!clone_second)
							return result;
						return second.get(id).mapCallback(function (error, row) {
							if (error || !row)
								return second.insert(result);
							return result;
						}, this);
					}, this);
				} else
					return first.get(id);
			},

			_query: function (query, options) {
				var first = this.__first;
				var second = this.__second;
				if (this.__query_options.start != "first") {
					first = this.__second;
					second = this.__first;
				}
				var strategy = this.__query_options.strategy;
				var clone = this.__query_options.clone;
				var clone_second = this.__get_options.clone_second;
				var or_on_null = this.__query_options.or_on_null;
				var result = null;
				if (strategy == "or") {
					this.trigger("query_first", query, options);
					return first.query(query, options).mapCallback(function (error, result) {
						if (error || (!result && or_on_null)) {
							this.trigger("query_second", query, options);
							return second.query(query, options).mapSuccess(function (result) {
								if (result && clone) {
									var arr = result.asArray();
									return first.insert_all(arr, {query: query, options: options}, {dual_insert: true}).mapSuccess(function () {
										return new ArrayIterator(arr);
									});
								}
								return result;
							}, this);
						}
						if (!clone_second)
							return result;
						this.trigger("query_second", query, options);
						return second.query(query, options).mapCallback(function (error, result2) {
							if (error || !result2) {
								var arr = result.asArray();
								return second.insert_all(arr, {query: query, options: options}, {dual_insert: true}).mapSuccess(function () {
									return new ArrayIterator(arr);
								});
							}
							return result;
						}, this);
					}, this);
				} else {
					this.trigger("query_first", query, options);
					return first.query(query, options);
				}
			}

		};
	});
});
