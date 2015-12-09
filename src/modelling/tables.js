Scoped.define("module:Modelling.Table", [
                                         "base:Class",
                                         "base:Events.EventsMixin",
                                         "base:Objs",
                                         "base:Types",
                                         "base:Iterators.MappedIterator"
                                         ], function (Class, EventsMixin, Objs, Types, MappedIterator, scoped) {
	return Class.extend({scoped: scoped}, [EventsMixin, function (inherited) {			
		return {

			constructor: function (store, model_type, options) {
				inherited.constructor.call(this);
				this.__store = store;
				this.__model_type = model_type;
				this.__options = Objs.extend({
					// Attribute that describes the type
					type_column: null,
					// Creation options
					auto_create: false,
					// Update options
					auto_update: true,
					// Save invalid
					save_invalid: false
				}, options || {});
				this.__store.on("insert", function (obj) {
					this.trigger("create", obj);
				}, this);
				this.__store.on("update", function (row, data) {
					var id = row[this.primary_key()];
					this.trigger("update", id, data, row);
					this.trigger("update:" + id, data);
				}, this);
				this.__store.on("remove", function (id) {
					this.trigger("remove", id);
					this.trigger("remove:" + id);
				}, this);
			},

			modelClass: function (cls) {
				cls = cls || this.__model_type;
				return Types.is_string(cls) ? Scoped.getGlobal(cls) : cls;
			},

			newModel: function (attributes, cls, ctx) {
				cls = this.modelClass(cls);
				var model = new cls(attributes, this, {}, ctx);
				if (this.__options.auto_create)
					model.save();
				return model;
			},

			materialize: function (obj, ctx) {
				if (!obj)
					return null;
				var cls = this.modelClass(this.__options.type_column && obj[this.__options.type_column] ? this.__options.type_column : null);
				return new cls(obj, this, {newModel: false}, ctx);
			},

			options: function () {
				return this.__options;
			},

			store: function () {
				return this.__store;
			},

			findById: function (id, ctx) {
				return this.__store.get(id, ctx).mapSuccess(function (obj) {
					return this.materialize(obj, ctx);
				}, this);
			},

			findBy: function (query, options, ctx) {
				return this.allBy(query, Objs.extend({limit: 1}, options), ctx).mapSuccess(function (iter) {
					return iter.next();
				});
			},

			allBy: function (query, options, ctx) {
				return this.__store.query(query, options, ctx).mapSuccess(function (iterator) {
					return new MappedIterator(iterator, function (obj) {
						return this.materialize(obj, ctx);
					}, this);
				}, this);
			},

			primary_key: function () {
				return (Types.is_string(this.__model_type) ? Scoped.getGlobal(this.__model_type) : this.__model_type).primary_key();
			},

			all: function (options, ctx) {
				return this.allBy({}, options, ctx);
			},

			query: function () {
				// Alias
				return this.allBy.apply(this, arguments);
			},

			scheme: function () {
				return this.__model_type.scheme();
			},

			ensure_indices: function () {
				if (!("ensure_index" in this.__store))
					return false;
				var scheme = this.scheme();
				for (var key in scheme) {
					if (scheme[key].index)
						this.__store.ensure_index(key);
				}
				return true;
			}

		};
	}]);
});