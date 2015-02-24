
Scoped.define("module:Stores.ConversionStore", [
          "module:Stores.BaseStore",
          "base:Objs",
          "base:Iterators.MappedIterator"
  	], function (BaseStore, Objs, MappedIterator, scoped) {
  	return BaseStore.extend({scoped: scoped}, function (inherited) {			
  		return {

			constructor: function (store, options) {
				options = options || {};
				options.id_key = store._id_key;
				inherited.constructor.call(this, options);
				this.__store = store;
				this.__key_encoding = options["key_encoding"] || {};
				this.__key_decoding = options["key_decoding"] || {};
				this.__value_encoding = options["value_encoding"] || {};
				this.__value_decoding = options["value_decoding"] || {};
				this.__projection = options["projection"] || {};
			},
			
			store: function () {
				return this.__store;
			},
			
			encode_object: function (obj) {
				if (!obj)
					return null;
				var result = {};
				for (var key in obj) {
				    var encoded_key = this.encode_key(key);
				    if (encoded_key)
					    result[encoded_key] = this.encode_value(key, obj[key]);
				}
				return Objs.extend(result, this.__projection);
			},
			
			decode_object: function (obj) {
				if (!obj)
					return null;
				var result = {};
				for (var key in obj) {
				    var decoded_key = this.decode_key(key);
				    if (decoded_key)
					    result[decoded_key] = this.decode_value(key, obj[key]);
			    }
				for (key in this.__projection)
					delete result[key];
				return result;
			},
			
			encode_key: function (key) {
				return key in this.__key_encoding ? this.__key_encoding[key] : key;
			},
			
			decode_key: function (key) {
				return key in this.__key_decoding ? this.__key_decoding[key] : key;
			},
			
			encode_value: function (key, value) {
				return key in this.__value_encoding ? this.__value_encoding[key](value) : value;
			},
			
			decode_value: function (key, value) {
				return key in this.__value_decoding ? this.__value_decoding[key](value) : value;
			},	
		
			_query_capabilities: function () {
				return this.__store._query_capabilities();
			},
			
			_ensure_index: function (key) {
				return this.__store.ensure_index(key);
			},
			
			_insert: function (data) {
				return this.__store.insert(this.encode_object(data)).mapSuccess(this.decode_object, this);
			},
			
			_remove: function (id) {
				return this.__store.remove(this.encode_value(this._id_key, id));
			},
		
			_get: function (id) {
				return this.__store.get(this.encode_value(this._id_key, id)).mapSuccess(this.decode_object, this);
			},
			
			_update: function (id, data) {
				return this.__store.update(this.encode_value(this._id_key, id), this.encode_object(data)).mapSuccess(this.decode_object, this);
			},
			
			_query: function (query, options) {
				return this.__store.query(this.encode_object(query), options).mapSuccess(function (result) {
					return new MappedIterator(result, this.decode_object, this);
				}, this);
			}		

  		};
  	});
});
