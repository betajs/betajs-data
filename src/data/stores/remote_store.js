BetaJS.Stores.StoreException.extend("BetaJS.Stores.RemoteStoreException", {
	
	constructor: function (source) {
		source = BetaJS.Net.AjaxException.ensure(source);
		this._inherited(BetaJS.Stores.RemoteStoreException, "constructor", source.toString());
		this.__source = source;
	},
	
	source: function () {
		return this.__source;
	}
	
});

BetaJS.Stores.BaseStore.extend("BetaJS.Stores.RemoteStore", {

	constructor : function(uri, ajax, options) {
		this._inherited(BetaJS.Stores.RemoteStore, "constructor", options);
		this._uri = uri;
		this.__ajax = ajax;
		this.__options = BetaJS.Objs.extend({
			"update_method": "PUT",
			"uri_mappings": {}
		}, options || {});
	},
	
	getUri: function () {
		return this._uri;
	},
	
	prepare_uri: function (action, data) {
		if (this.__options["uri_mappings"][action])
			return this.__options["uri_mappings"][action](data);
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
				return new BetaJS.Stores.RemoteStoreException(e);
			if (parse_json && BetaJS.Types.is_string(result)) {
				try {
					result = JSON.parse(result);
				} catch (e) {}
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
		var copy = BetaJS.Objs.clone(data, 1);
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
	
});


BetaJS.Stores.RemoteStore.extend("BetaJS.Stores.QueryGetParamsRemoteStore", {

	constructor : function(uri, ajax, capability_params, options) {
		this._inherited(BetaJS.Stores.QueryGetParamsRemoteStore, "constructor", uri, ajax, options);
		this.__capability_params = capability_params;
	},
	
	_query_capabilities: function () {
		var caps = {};
		if ("skip" in this.__capability_params)
			caps.skip = true;
		if ("limit" in this.__capability_params)
			caps.limit = true;
		if ("query" in this.__capability_params)
			caps.query = true;
		if ("sort" in this.__capability_params)
			caps.sort = true;
		return caps;
	},

	_encode_query: function (query, options) {
		options = options || {};
		var uri = this.getUri() + "?"; 
		if (options["skip"] && "skip" in this.__capability_params)
			uri += this.__capability_params["skip"] + "=" + options["skip"] + "&";
		if (options["limit"] && "limit" in this.__capability_params)
			uri += this.__capability_params["limit"] + "=" + options["limit"] + "&";
		if (options["sort"] && "sort" in this.__capability_params)
			uri += this.__capability_params["sort"] + "=" + JSON.stringify(options["sort"]) + "&";
		if ("query" in this.__capability_params)
			uri += this.__capability_params["query"] + "=" + JSON.stringify(query) + "&";
		return {
			uri: uri
		};		
	}

});