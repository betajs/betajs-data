Scoped.define("module:Modelling.SchemedProperties", [
          "base:Properties.Properties",
          "base:Types",
          "base:Promise",
          "base:Objs",
          "module:Stores.RemoteStoreException",
          "base:Net.HttpHeader",
          "module:Modelling.ModelInvalidException"
  	], function (Properties, Types, Promise, Objs, RemoteStoreException, HttpHeader, ModelInvalidException, scoped) {
  	return Properties.extend({scoped: scoped}, function (inherited) {			
  		return {

			constructor: function (attributes) {
				inherited.constructor.call(this);
				var scheme = this.cls.scheme();
				this._properties_changed = {};
				this.__errors = {};
				for (var key in scheme) {
					if ("def" in scheme[key]) 
						this.set(key, Types.is_function(scheme[key].def) ? scheme[key].def() : scheme[key].def);
					else if (scheme[key].auto_create)
						this.set(key, scheme[key].auto_create(this));
					else
						this.set(key, null);
				}
				this._properties_changed = {};
				this.__errors = {};
				for (key in attributes)
					this.set(key, attributes[key]);
			},
			
			_unsetChanged: function (key) {
				delete this._properties_changed[key];
			},
			
			_beforeSet: function (key, value) {
				var scheme = this.cls.scheme();
				if (!(key in scheme))
					return value;
				var sch = scheme[key];
				if (sch.type)
					value = Types.parseType(value, sch.type);
				if (sch.transform)
					value = sch.transform.apply(this, [value]);
				return value;
			},
			
			_afterSet: function (key, value) {
				var scheme = this.cls.scheme();
				if (!(key in scheme))
					return;
				this._properties_changed[key] = value;
				delete this.__errors[key];
				if (scheme[key].after_set) {
					var f = Types.is_string(scheme[key].after_set) ? this[scheme[key].after_set] : scheme[key].after_set;
					f.apply(this, [value]);
				}
			},
			
			isChanged: function () {
				return !Types.is_empty(this._properties_changed);
			},
		
			properties_changed: function () {
				return this._properties_changed;
			},
			
			get_all_properties: function () {
				var result = {};
				var scheme = this.cls.scheme();
				for (var key in scheme)
					result[key] = this.get(key);
				return result;
			},
			
			validate: function () {
				this.trigger("validate");
				var promises = [];
				for (var key in this.cls.scheme())
					promises.push(this._validateAttr(key));
				promises.push(Promise.box(this._customValidate, this));
				return Promise.and(promises).end().mapSuccess(function (arr) {
					var valid = true;
					Objs.iter(arr, function (entry) {
						valid = valid && entry;
					});
					return valid;
				});
			},
			
			_customValidate: function () {
				return true;
			},
			
			_validateAttr: function (attr) {
				delete this.__errors[attr];
				var scheme = this.cls.scheme();
				var entry = scheme[attr];
				var validate = entry["validate"];
				if (!validate)
					return Promise.value(true);
				if (!Types.is_array(validate))
					validate = [validate];
				var value = this.get(attr);
				var promises = [];
				Objs.iter(validate, function (validator) {
					promises.push(Promise.box(validator.validate, validator, [value, this]));
				}, this);
				return Promise.and(promises).end().mapSuccess(function (arr) {
					var valid = true;
					Objs.iter(arr, function (entry) {
						if (entry !== null) {
							valid = false;
							this.__errors[attr] = entry;
						}
					}, this);
					this.trigger("validate:" + attr, valid, this.__errors[attr]);
					return valid;
				}, this);
			},
			
			setError: function (attr, error) {
				this.__errors[attr] = error;
				this.trigger("validate:" + attr, !(attr in this.__errors), this.__errors[attr]);
			},
			
			errors: function () {
				return this.__errors;
			},
			
			getError: function (attr) {
				return this.__errors[attr];
			},
			
			asRecord: function (tags) {
				var rec = {};
				var scheme = this.cls.scheme();
				var props = this.get_all_properties();
				tags = tags || {};
				for (var key in props) {
					if (key in scheme) {
						var target = scheme[key]["tags"] || [];
						var tarobj = {};
						Objs.iter(target, function (value) {
							tarobj[value] = true;
						});
						var success = true;
						Objs.iter(tags, function (x) {
							success = success && x in tarobj;
						}, this);
						if (success)
							rec[key] = props[key];
					}
				}
				return rec;		
			},
			
			setByTags: function (data, tags) {
				var scheme = this.cls.scheme();
				tags = tags || {};
				for (var key in data)  {
					if (key in scheme) {
						var target = scheme[key]["tags"] || [];
						var tarobj = {};
						Objs.iter(target, function (value) {
							tarobj[value] = true;
						});
						var success = true;
						Objs.iter(tags, function (x) {
							success = success && x in tarobj;
						}, this);
						if (success)
							this.set(key, data[key]);
					}
				}
			},
			
			validation_exception_conversion: function (e) {
				var source = e;
				if ("instance_of" in e && e.instance_of(RemoteStoreException))
					source = e.source();
				else if (!("status_code" in source && "data" in source))
					return e;
				if (source.status_code() == HttpHeader.HTTP_STATUS_PRECONDITION_FAILED && source.data()) {
					Objs.iter(source.data(), function (value, key) {
						this.setError(key, value);
					}, this);
					e = new ModelInvalidException(this);
				}
				return e;		
			}
			
  		};
	}, {
	
		_initializeScheme: function () {
			return {};
		},
		
		asRecords: function (arr, tags) {
			return arr.map(function (item) {
				return item.asRecord(tags);
			});
		},
		
		filterPersistent: function (obj) {
			var result = {};
			var scheme = this.scheme();
			for (var key in obj) {
				if ((!Types.is_defined(scheme[key].persistent) || scheme[key].persistent) && (Types.is_defined(obj[key])))
					result[key] = obj[key];
			}
			return result;
		}
		
	}, {
		
		scheme: function () {
			this.__scheme = this.__scheme || this._initializeScheme();
			return this.__scheme;
		}
		
	});
});


Scoped.define("module:Modelling.AssociatedProperties", [
         "module:Modelling.SchemedProperties"
 	], function (SchemedProperties, scoped) {
 	return SchemedProperties.extend({scoped: scoped}, function (inherited) {			
 		return {
			
			constructor: function (attributes) {
				inherited.constructor.call(this, attributes);
				this.assocs = this._initializeAssociations();
				for (var key in this.assocs)
					this.__addAssoc(key, this.assocs[key]);
			},
			
			__addAssoc: function (key, obj) {
				this[key] = function () {
					return obj.yield.apply(obj, arguments);
				};
			},
			
			_initializeAssociations: function () {
				return {};
			},
			
			destroy: function () {
				for (var key in this.assocs)
					this.assocs[key].destroy();
				inherited.destroy.call(this);
			},
		
			id: function () {
				return this.get(this.cls.primary_key());
			},
			
			hasId: function () {
				return this.has(this.cls.primary_key());
			}
			
		};
		
 	}, {
	
		primary_key: function () {
			return "id";
		},
		
		_initializeScheme: function () {
			var s = {};
			s[this.primary_key()] = {
				type: "id",
				tags: ["read"],
				
				after_set: null,
				persistent: true
			};
			return s;
		}
		
 	});
});