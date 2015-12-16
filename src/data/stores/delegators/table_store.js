
Scoped.define("module:Stores.TableStore", [
    "module:Stores.BaseStore",
    "base:Iterators.MappedIterator",
    "module:Queries.Constrained"
], function (BaseStore, MappedIterator, Constrained, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (table, options) {
				this.__table = table;
				options = options || {};
				options.id_key = table.primary_key();
				inherited.constructor.call(this, options);
				this.__options = {
					insertTags: options.insertTags || [],
					readTags: options.readTags || [],
					updateTags: options.updateTags || []
				};
			},

			_query_capabilities: function () {
				return Constrained.fullConstrainedQueryCapabilities();
			},

			_insert: function (data, ctx) {
				var model = this.__table.newModel({}, null, ctx);
				model.setByTags(data, this.__options.insertTags);
				return model.save().mapSuccess(function () {
					return model.asRecord(this.__options.readTags);
				}, this);
			},

			_remove: function (id, ctx) {
				return this.__table.findById(id, ctx).mapSuccess(function (model) {
					return model ? model.remove() : model;
				}, this);
			},

			_get: function (id, ctx) {
				return this.__table.findById(id, ctx).mapSuccess(function (model) {
					return model ? model.asRecord(this.__options.readTags) : model;
				}, this);
			},

			_update: function (id, data, ctx) {
				return this.__table.findById(id, ctx).mapSuccess(function (model) {
					if (!model)
						return model;
					model.setByTags(data, this.__options.updateTags);
					return model.save().mapSuccess(function () {
						return model.asRecord(this.__options.readTags);
					}, this);
				}, this);
			},

			_query: function (query, options, ctx) {
				return this.__table.query(query, options, ctx).mapSuccess(function (models) {
					return new MappedIterator(models, function (model) {
						return model.asRecord(this.__options.readTags);
					}, this);
				}, this);
			}

		};
	});
});

