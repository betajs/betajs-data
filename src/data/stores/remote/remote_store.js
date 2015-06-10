Scoped.define("module:Stores.RemoteStoreException", [
                                                     "module:Stores.StoreException",
                                                     "base:Net.AjaxException"
                                                     ], function (StoreException, AjaxException, scoped) {
	return StoreException.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (source) {
				source = AjaxException.ensure(source);
				inherited.constructor.call(this, source.toString());
				this.__source = source;
			},

			source: function () {
				return this.__source;
			}

		};
	});
});



Scoped.define("module:Stores.RemoteStore", [
                                            "module:Stores.BaseStore",
                                            "module:Stores.RemoteStoreException",
                                            "base:Objs",
                                            "base:Types",
                                            "json:"
                                            ], function (BaseStore, RemoteStoreException, Objs, Types, JSON, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor : function(uri, ajax, options) {
				inherited.constructor.call(this, options);
				this._uri = uri;
				this.__ajax = ajax;
				this.__options = Objs.extend({
					"update_method": "PUT",
					"uri_mappings": {}
				}, options || {});
			},

			getUri: function () {
				return this._uri;
			},

			prepare_uri: function (action, data) {
				if (this.__options.uri_mappings[action])
					return this.__options.uri_mappings[action](data);
				if (action == "remove" || action == "get" || action == "update")
					return this.getUri() + "/" + data[this._id_key];
				return this.getUri();
			},

			_encode_query: function (query, options) {
				return {
					uri: this.prepare_uri("query")
				};		
			},

			__invoke: function (options, parse_json) {
				return this.__ajax.asyncCall(options).mapCallback(function (e, result) {
					if (e)
						return new RemoteStoreException(e);
					if (parse_json && Types.is_string(result)) {
						try {
							result = JSON.parse(result);
						} catch (ex) {}
					}
					return result;
				});
			},

			_insert : function(data) {
				return this.__invoke({
					method: "POST",
					uri: this.prepare_uri("insert", data),
					data: data
				}, true);
			},

			_get : function(id) {
				var data = {};
				data[this._id_key] = id;
				return this.__invoke({
					uri: this.prepare_uri("get", data)
				});
			},

			_update : function(id, data) {
				var copy = Objs.clone(data, 1);
				copy[this._id_key] = id;
				return this.__invoke({
					method: this.__options.update_method,
					uri: this.prepare_uri("update", copy),
					data: data
				});
			},

			_remove : function(id) {
				var data = {};
				data[this._id_key] = id;
				return this.__invoke({
					method: "DELETE",
					uri: this.prepare_uri("remove", data)
				});
			},

			_query : function(query, options) {
				return this.__invoke(this._encode_query(query, options), true);
			}	

		};
	});
});


Scoped.define("module:Stores.QueryGetParamsRemoteStore", [
                                                          "module:Queries",
                                                          "module:Stores.RemoteStore",
                                                          "json:"
                                                          ], function (Queries, RemoteStore, JSON, scoped) {
	return RemoteStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor : function(uri, ajax, capability_params, options) {
				inherited.constructor.call(this, uri, ajax, options);
				this.__capability_params = capability_params;
			},

			_query_capabilities: function () {
				var caps = {};
				if ("skip" in this.__capability_params)
					caps.skip = true;
				if ("limit" in this.__capability_params)
					caps.limit = true;
				if ("query" in this.__capability_params)
					caps.query = Queries.fullQueryCapabilities();
				if ("sort" in this.__capability_params)
					caps.sort = true;
				return caps;
			},

			_encode_query: function (query, options) {
				options = options || {};
				var uri = this.getUri() + "?"; 
				if (options.skip && "skip" in this.__capability_params)
					uri += this.__capability_params.skip + "=" + options.skip + "&";
				if (options.limit && "limit" in this.__capability_params)
					uri += this.__capability_params.limit + "=" + options.limit + "&";
				if (options.sort && "sort" in this.__capability_params)
					uri += this.__capability_params.sort + "=" + JSON.stringify(options.sort) + "&";
				if ("query" in this.__capability_params)
					uri += this.__capability_params.query + "=" + JSON.stringify(query) + "&";
				return {
					uri: uri
				};		
			}

		};
	});
});