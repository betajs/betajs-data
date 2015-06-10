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


/**
 * @class RemoteStore
 *
 * RemoteStore is a store designed to be used with remote data. It is also
 * extended to create a queriable remote store.
 */
Scoped.define("module:Stores.RemoteStore", [
         "module:Stores.BaseStore",
         "module:Stores.RemoteStoreException",
         "base:Objs",
         "base:Types",
         "json:"
 	], function (BaseStore, RemoteStoreException, Objs, Types, JSON, scoped) {
 	return BaseStore.extend({scoped: scoped}, function (inherited) {			
 		return {

     /**
       * @method constructor
       *
       * @param {string} uri The remote endpoint where the queriable data is accessible.
       * @param {object} ajax An instance of an concrete implementation of
       * BetaJS.Net.AbstractAjax. Whether BetaJS.Data is being used in
       * the client or server dictates which implementation of Ajax to use.
       * @param {object} options The options for the RemoteStore. Currently the
       * supported options are "update_method" and "uri_mappings".
       *
       * @example
       * // Returns new instance of RemoteStore
       * new RemoteStore('/api/v1/people', new BetaJS.Browser.JQueryAjax(), {})
       */
			constructor : function(uri, ajax, options) {
				inherited.constructor.call(this, options);
				this._uri = uri;
				this.__ajax = ajax;
				this.__options = Objs.extend({
					"update_method": "PUT",
					"uri_mappings": {}
				}, options || {});
			},
			
      /**
       * @method getUri
       *
       * @return {string} The uri instance variable.
       */
			getUri: function () {
				return this._uri;
			},
			
      /**
       * @method prepare_uri
       *
       * @param {string} action The action to be performed on the remote data
       * store. For example, remove, get...
       * @param {object} data The data on which the action will be performed.
       * For example, the object being updated.
       *
       * @return {string} The uri to be used to perform the specified action on
       * the specified data.
       */
			prepare_uri: function (action, data) {
				if (this.__options.uri_mappings[action])
					return this.__options.uri_mappings[action](data);
				if (action == "remove" || action == "get" || action == "update")
					return this.getUri() + "/" + data[this._id_key];
				return this.getUri();
			},
			
      /**
       * @method _encode_query
       *
       * @param {object} query The query object.
       * @param {object} options Options for the specified query.
       *
       * @protected
       *
       * @return {string} A uri to perform the specified query.
       */
			_encode_query: function (query, options) {
				return {
					uri: this.prepare_uri("query")
				};		
			},
			
      /**
       * @method __invoke
       *
       * Invoke the specified operation on the remote data store.
       *
       * @param {object} options The options for the ajax.asyncCall. Specifies
       * the method, uri, and data. See "_insert" for an example.
       * @param {boolean} parse_json Boolean flag indicating if the response
       * should be parsed as json.
       *
       * @private
       *
       * @return {object} The remote response from invoking the specified
       * operation.
       */
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
			
      /**
       * @method _insert
       *
       * Insert the given data into the remote store.
       *
       * @param {object} data The data to be inserted.
       *
       * @protected
       *
       * @return {object} The result of invoking insert.
       */
			_insert : function(data) {
				return this.__invoke({
					method: "POST",
					uri: this.prepare_uri("insert", data),
					data: data
				}, true);
			},
		
      /**
       * @method _get
       *
       * Get the data specified by the id parameter from the remote store.
       *
       * @param {int} id The id of the data to be retrieved.
       *
       * @protected
       *
       * @return {object} The desired data.
       */
			_get : function(id) {
				var data = {};
				data[this._id_key] = id;
				return this.__invoke({
					uri: this.prepare_uri("get", data)
				});
			},
		
      /**
       * @method _update
       *
       * Update data.
       *
       * @param {int} id The id of the data to be updated.
       * @param {object} data The new data to be used for the update.
       *
       * @protected
       *
       * @return {object} The result of invoking the update operation on the
       * remote store.
       */
			_update : function(id, data) {
				var copy = Objs.clone(data, 1);
				copy[this._id_key] = id;
				return this.__invoke({
					method: this.__options.update_method,
					uri: this.prepare_uri("update", copy),
					data: data
				});
			},
			
      /**
       * @method _remove
       *
       * Remove data.
       *
       * @param {int} id The id of the data to be removed.
       *
       * @protected
       *
       * @return {object} The result of invoking the remove operation on the
       * remote store.
       */
			_remove : function(id) {
				var data = {};
				data[this._id_key] = id;
				return this.__invoke({
					method: "DELETE",
					uri: this.prepare_uri("remove", data)
				});
			},
		
      /**
       * @method _query
       *
       * Query the remote store.
       *
       * @param {object} query The query object specifying the query fields and
       * their respective values.
       * @param {object} options The options object specifying which options are
       * set, and what the respective values are.
       *
       * @protected
       *
       * @return {object} The result of invoking the query operation on the
       * remote store.
       */
			_query : function(query, options) {
				return this.__invoke(this._encode_query(query, options), true);
			}	
			
 		};
 	});
});


/**
 * @class QueryGetParamsRemoteStore
 *
 * QueryGetParamsRemoteStore should be used if the following conditions are met.
 * - Data is remotely accessible. For example, accessible through REST ajax
 *   calls.
 * - Data is quierable and will be queried. 
 *
 * @augments RemoteStore
 */
Scoped.define("module:Stores.QueryGetParamsRemoteStore", [
        "module:Queries",
        "module:Stores.RemoteStore",
        "json:"
	], function (Queries, RemoteStore, JSON, scoped) {
	return RemoteStore.extend({scoped: scoped}, function (inherited) {			
		return {

      /**
       * @inheritdoc
       *
       * @param {Object} capability_params An object representing the remote
       * endpoints querying capabilities. The keys are
       * query aspects the remote data source can handle. The values are the
       * identifiers for these capabilites in the uri. For example, if a server
       * can process the skip field in a query, and expects the skip fields to
       * be called "jump" in the Uri, the capability_param object would be
       * `{"skip": "jump"}`.
       * @param {Object} options
       *
       * @example <caption>Creation of client side QueryGetParamsRemoteStore</caption>
       * // returns new QueryGetParamsRemoteStore
       * new QueryGetParamsRemoteStore('api/v1/people',
       *                                new BetaJS.Browser.JQueryAjax(),
       *                                {"skip": "skip", "query": "query"});
       *
       * @return {QueryGetParamsRemoteStore} The newly constructed instance of
       * QueryGetParamsRemoteStore.
       */
			constructor : function(uri, ajax, capability_params, options) {
				inherited.constructor.call(this, uri, ajax, options);
				this.__capability_params = capability_params;
			},

      /**
       * @method _query_capabilities
       *
       * Helper method for dealing with capability_params.
       *
       * @protected
       *
       * @return {object} Key/value object where key is possible capability
       * parameter and value is if that capability_parameter is included for
       * this instance.
       */
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

      /**
       * @method _encode_query
       *
       * Helper method that encodes the query and the options into a uri to send
       * to the remote data source.
       *
       * @param {object} query A query to be encoded into uri form. The query
       * will only be included in the uri if "query" was included in the
       * capability_params during this instances construction.
       * @param {object} options A set of options to be encoded into uri form.
       *
       * @protected
       *
       * @TODO Include the option of including the query param in the uri as a
       * simple list of keys and values. For example, if the query param is
       * `{'test': 'hi'}`, the uri becomes 'BASE_URL?test=hi&MORE_PARAMS'
       * instead of 'BASE_URL?query={"test":"hi"}&MORE_PARAMS'. This change
       * would increase the number of server/api configurations that could use
       * this method of encoding queries.
       *
       * @return {object} The only key is the uri, and the associated value is
       * the uri representing the query and the options.
       */
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
