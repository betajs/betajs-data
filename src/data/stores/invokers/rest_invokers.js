Scoped.define("module:Stores.Invokers.StoreInvokeeRestInvoker", [
    "base:Class",
    "base:Objs",
    "base:Types",
    "module:Stores.Invokers.StoreInvokee"
], function (Class, Objs, Types, Invokee, scoped) {
	return Class.extend({scoped: scoped}, [Invokee, function (inherited) {
		return {
			
			constructor: function (restInvokee, options) {
				inherited.constructor.call(this);
				this.__restInvokee = restInvokee;
				this.__options = Objs.tree_extend({
					methodMap: {
						"insert": "POST",
						"get": "GET",
						"remove": "DELETE",
						"update": "PUT",
						"query": "GET" 
					},
					toMethod: null,
					dataMap: {
						"insert": function (data, context) { return data; },
						"update": function (data, context) { return data.data; }
					},
					toData: null,
					getMap: {
						"query": function (data, context) {
							var result = {};
							if (data.query && !Types.is_empty(data.query))
								result.query = JSON.stringify(data.query);
							result = Objs.extend(result, data.options);
							if (result.sort)
								result.sort = JSON.stringify(result.sort);
							return result;
						},
						"update": function (data, context) {
							var result = {};
							if (data.transaction_id)
								result.transactionid = data.transaction_id;
							return result;
						}
					},
					toGet: null,
					baseURI: "/",
					uriMap: {
						"get": function (id, context) { return id; },
						"remove": function (id, context) { return id; },
						"update": function (data, context) { return data.id; }
					},
					toURI: null,
					context: this
				}, options);
			},
			
			storeInvoke: function (member, data, context) {
				return this.__restInvokee.restInvoke(
					this._toMethod(member, data, context),
					this._toURI(member, data, context),
					this._toData(member, data, context),
					this._toGet(member, data, context)
				);
			},
			
			_toMethod: function (member, data, context) {
				var method = null;
				if (this.__options.toMethod)
					method = this.__options.toMethod.call(this.__options.context, member, data, context);
				return method || this.__options.methodMap[member];
			},
			
			_toURI: function (member, data, context) {
				var base = Types.is_function(this.__options.baseURI) ? this.__options.baseURI.call(this.__options.context, context) : this.__options.baseURI;
				if (this.__options.toURI) {
					var ret = this.__options.toURI.call(this.__options.context, member, data, context);
					if (ret)
						return base + ret;
				}
				return base + (member in this.__options.uriMap ? (Types.is_function(this.__options.uriMap[member]) ? this.__options.uriMap[member].call(this.__options.context, data, context): this.__options.uriMap[member]) : "");
			},
			
			_toData: function (member, data, context) {
				var result = null;
				if (this.__options.toData)
					result = this.__options.toData.call(this.__options.context, member, data, context);
				return result || (member in this.__options.dataMap ? this.__options.dataMap[member].call(this.__options.context, data, context) : null);
			},
			
			_toGet: function (member, data, context) {
				var result = null;
				if (this.__options.toGet)
					result = this.__options.toGet.call(this.__options.context, member, data, context);
				return result || (member in this.__options.getMap ? this.__options.getMap[member].call(this.__options.context, data, context) : null);
			}
			
			
		};
	}]);
});


Scoped.define("module:Stores.Invokers.RouteredRestInvokeeStoreInvoker", [
     "base:Class",
     "base:Objs",
     "base:Types",
     "module:Stores.Invokers.RouteredRestInvokee"
 ], function (Class, Objs, Types, Invokee, scoped) {
 	return Class.extend({scoped: scoped}, [Invokee, function (inherited) {
 		return {

			constructor: function (storeInvokee, options) {
				inherited.constructor.call(this);
				this.__storeInvokee = storeInvokee;
				this.__options = Objs.tree_extend({
					dataMap: {
						"insert": function (member, uriData, post, get, ctx) {
							return post;
						},
						"update": function (member, uriData, post, get, ctx) {
							return {
								id: uriData.id,
								data: post,
								transaction_id: get.transactionid
							};
						},
						"get": function (member, uriData, post, get, ctx) {
							return uriData.id;
						},
						"remove": function (member, uriData, post, get, ctx) {
							return uriData.id;
						},
						"query": function (member, uriData, post, get, ctx) {
							var result = {};
							try {
								if (get.query)
									result.query = JSON.parse(get.query);
							} catch (e) {}
							var opts = Objs.clone(get, 1);
							delete opts.query;
							if (!Types.is_empty(opts))
								result.options = opts;
							try {
								if (result.options.sort)
									result.options.sort = JSON.parse(result.options.sort);
							} catch (e) {}
							return result;
						}
					},
					toData: null,
					contextMap: {},
					toContext: function (member, uriData, post, get, ctx) {
						return ctx;
					},
					context: this
				}, options);
			},
			
			routeredRestInvoke: function (member, uriData, post, get, ctx) {
				return this.__storeInvokee.storeInvoke(
					member,
					this._toData(member, uriData, post, get, ctx),
					this._toContext(member, uriData, post, get, ctx)
				);
 			},
 			
 			_toData: function (member, uriData, post, get, ctx) {
				var data = null;
				if (this.__options.toData)
					data = this.__options.toData.call(this.__options.context, member, uriData, post, get, ctx);
				return data || (member in this.__options.dataMap ? this.__options.dataMap[member].call(this.__options.context, member, uriData, post, get, ctx) : null);
 			},
 			
 			_toContext: function (member, uriData, post, get, ctx) {
				var data = null;
				if (this.__options.toContext)
					data = this.__options.toContext.call(this.__options.context, member, uriData, post, get, ctx);
				return data || (member in this.__options.contextMap ? this.__options.contextMap[member].call(this.__options.context, member, uriData, post, get, ctx) : null);
 			}
 		
		};
	}]);
});


Scoped.define("module:Stores.Invokers.RestInvokeeStoreInvoker", [
     "module:Stores.Invokers.RouteredRestInvokeeStoreInvoker",
     "module:Stores.Invokers.RestInvokee",
     "base:Router.RouteParser",
     "base:Objs",
     "base:Types"
 ], function (Class, Invokee, RouteParser, Objs, Types, scoped) {
 	return Class.extend({scoped: scoped}, [Invokee, function (inherited) {
 		return {
 			
			constructor: function (storeInvokee, options) {
				inherited.constructor.call(this, storeInvokee, Objs.tree_extend({
					baseURI: "/",
					methodMap: {
						"insert": "POST",
						"get": "GET",
						"remove": "DELETE",
						"update": "PUT",
						"query": "GET" 
					},
					toMethod: null,
					uriMap: {
						"get": "(id:.+)",
						"remove": "(id:.+)",
						"update": "(id:.+)"
					},
					toURI: null
				}, options));
				this.__routes = {};
				Objs.iter(this.__options.methodMap, function (method, member) {
					var s = "";
					var base = Types.is_function(this.__options.baseURI) ? this.__options.baseURI.call(this.__options.context) : this.__options.baseURI;
					if (this.__options.toURI) {
						var ret = this.__options.toURI.call(this.__options.context, member);
						if (ret)
							s = base + ret;
					}
					if (!s)
						s = base + (member in this.__options.uriMap ? (Types.is_function(this.__options.uriMap[member]) ? this.__options.uriMap[member].call(this.__options.context): this.__options.uriMap[member]) : "");
					this.__routes[member] = method + " " + s;
				}, this);
				this.__routeParser = this.auto_destroy(new RouteParser(this.__routes));
			},
			
 			restInvoke: function (method, uri, post, get, ctx) {
 				var routed = this.__routeParser.parse(method + " " + uri);
 				return this.routeredRestInvoke(routed.name, routed.args, post, get, ctx);
 			}
			
		};
	}]);
});
