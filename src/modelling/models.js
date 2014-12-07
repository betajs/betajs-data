BetaJS.Modelling.AssociatedProperties.extend("BetaJS.Modelling.Model", {
	
	constructor: function (attributes, table, options) {
		this.__table = table;
		this.__options = BetaJS.Objs.extend({
			newModel: true,
			removed: false
		}, options);
		this.__silent = 1;
		this._inherited(BetaJS.Modelling.Model, "constructor", attributes);
		this.__silent = 0;
		if (!this.isNew()) {
			this._properties_changed = {};
			this._registerEvents();
		}
		if (this.option("auto_create") && this.isNew())
			this.save();
	},
	
	destroy: function () {
		this.__table.off(null, null, this);
		this.trigger("destroy");
		this._inherited(BetaJS.Modelling.Model, "destroy");
	},
	
	option: function (key) {
		var opts = key in this.__options ? this.__options : this.table().options();
		return opts[key];
	},
	
	table: function () {
		return this.__table;
	},
	
	isSaved: function () {
		return this.isRemoved() || (!this.isNew() && !this.isChanged());
	},
	
	isNew: function () {
		return this.option("newModel");
	},
	
	isRemoved: function () {
		return this.option("removed");
	},

	_registerEvents: function () {
		this.__table.on("update:" + this.id(), function (data) {
			if (this.isRemoved())
				return;
			this.__silent++;
			for (var key in data) {
				if (!this._properties_changed[key])
					this.set(key, data);
			}
			this.__silent--;
		}, this);
		this.__table.on("remove:" + this.id(), function () {
			if (this.isRemoved())
				return;
			this.trigger("remove");
			this.__options.removed = true;
		}, this);
	},
	
	update: function (data) {
		this.__silent++;
		this.setAll(data);
		this.__silent--;
		if (this.option("auto_update") && !this.isNew())
			this.save();
	},

	_afterSet: function (key, value, old_value, options) {
		this._inherited(BetaJS.Modelling.Model, "_afterSet", key, value, old_value, options);
		var scheme = this.cls.scheme();
		if (!(key in scheme) || this.__silent > 0)
			return;
		if (this.option("auto_update") && !this.isNew())
			this.save();
	},
	
	save: function () {
		if (this.isRemoved())
			return BetaJS.Promise.create({});
		if (!this.validate() && !this.options("save_invalid")) 
			return BetaJS.Promise.create(null, new BetaJS.Modelling.ModelInvalidException(this));
		var attrs;
		if (this.isNew()) {
			attrs = this.cls.filterPersistent(this.get_all_properties());
			if (this.__options.type_column)
				attrs[this.__options.type_column] = model.cls.classname;
		} else {
			attrs = this.cls.filterPersistent(this.properties_changed());
			if (BetaJS.Types.is_empty(attrs))
				return BetaJS.Promise.create(attrs);
		}
		var wasNew = this.isNew();
		var promise = this.isNew() ? this.__table.store().insert(attrs) : this.__table.store().update(this.id(), attrs);
		return promise.mapCallback(function (err, result) {
			if (err)
				return BetaJS.Exceptions.ensure(this.validation_exception_conversion(err));
			this.__silent++;
			this.setAll(result);
			this.__silent--;
			this._properties_changed = {};
			this.trigger("save");
			if (wasNew) {
				this.__options.newModel = false;
				this._registerEvents();
			}
			return result;
		}, this);
	},
	
	remove: function () {
		if (this.isNew() || this.isRemoved())
			return BetaJS.Promise.create(true);
		return this.__table.store().remove(this.id()).mapSuccess(function (result) {
			this.trigger("remove");		
			this.__options.removed = true;
			return result;
		}, this);
	}	
		
});