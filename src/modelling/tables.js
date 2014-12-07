BetaJS.Class.extend("BetaJS.Modelling.Table", [
	BetaJS.Events.EventsMixin,
	{

	constructor: function (store, model_type, options) {
		this._inherited(BetaJS.Modelling.Table, "constructor");
		this.__store = store;
		this.__model_type = model_type;
		this.__options = BetaJS.Objs.extend({
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
			this.trigger("create", obj, this.materializer(obj));
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
		return cls ? (BetaJS.Types.is_string(cls) ? BetaJS.Scopes.resolve(cls) : cls) : BetaJS.Scopes.resolve(this.__model_type);
	},
	
	newModel: function (attributes, cls) {
		cls = this.modelClass(cls);
		var model = new cls(attributes, this);
		if (this.__options.auto_create)
			model.save();
		return model;
	},
	
	materialize: function (obj) {
		if (!obj)
			return null;
		var cls = this.modelClass(this.__options.type_column && obj[this.__options.type_column] ? this.__options.type_column : null);
		return new cls(obj, this, {newModel: false});
	},
	
	options: function () {
		return this.__options;
	},
	
	store: function () {
		return this.__store;
	},
	
	findById: function (id) {
		return this.__store.get(id).mapSuccess(this.materialize, this);
	},

	findBy: function (query) {
		return this.allBy(query, {limit: 1}).mapSuccess(function (iter) {
			return iter.next();
		});
	},

	allBy: function (query, options) {
		return this.__store.query(query, options).mapSuccess(function (iterator) {
			return new BetaJS.Iterators.MappedIterator(iterator, function (obj) {
				return this.materialize(obj);
			}, this);
		}, this);
	},
	
	primary_key: function () {
		return BetaJS.Scopes.resolve(this.__model_type).primary_key();
	},
	
	all: function (options) {
		return this.allBy({}, options);
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
	},
	
	materializer: function (obj) {
		var self = this;
		return function () {
			return self.materialize(obj);
		};
	}
	
}]);