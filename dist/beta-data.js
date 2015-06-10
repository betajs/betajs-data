/*!
betajs-data - v1.0.0 - 2015-06-10
Copyright (c) Oliver Friedmann
MIT Software License.
*/
/*!
betajs-scoped - v0.0.1 - 2015-03-26
Copyright (c) Oliver Friedmann
MIT Software License.
*/
var Scoped = (function () {
var Globals = {

	get : function(key) {
		if (typeof window !== "undefined")
			return window[key];
		if (typeof global !== "undefined")
			return global[key];
		return null;
	},

	set : function(key, value) {
		if (typeof window !== "undefined")
			window[key] = value;
		if (typeof global !== "undefined")
			global[key] = value;
		return value;
	},
	
	setPath: function (path, value) {
		var args = path.split(".");
		if (args.length == 1)
			return this.set(path, value);		
		var current = this.get(args[0]) || this.set(args[0], {});
		for (var i = 1; i < args.length - 1; ++i) {
			if (!(args[i] in current))
				current[args[i]] = {};
			current = current[args[i]];
		}
		current[args[args.length - 1]] = value;
		return value;
	},
	
	getPath: function (path) {
		var args = path.split(".");
		if (args.length == 1)
			return this.get(path);		
		var current = this.get(args[0]);
		for (var i = 1; i < args.length; ++i) {
			if (!current)
				return current;
			current = current[args[i]];
		}
		return current;
	}

};
var Helper = {
		
	method: function (obj, func) {
		return function () {
			return func.apply(obj, arguments);
		};
	},
	
	extend: function (base, overwrite) {
		base = base || {};
		overwrite = overwrite || {};
		for (var key in overwrite)
			base[key] = overwrite[key];
		return base;
	},
	
	typeOf: function (obj) {
		return Object.prototype.toString.call(obj) === '[object Array]' ? "array" : typeof obj;
	},
	
	isEmpty: function (obj) {
		if (obj === null || typeof obj === "undefined")
			return true;
		if (this.typeOf(obj) == "array")
			return obj.length === 0;
		if (typeof obj !== "object")
			return false;
		for (var key in obj)
			return false;
		return true;
	},
	
	matchArgs: function (args, pattern) {
		var i = 0;
		var result = {};
		for (var key in pattern) {
			if (pattern[key] === true || this.typeOf(args[i]) == pattern[key]) {
				result[key] = args[i];
				i++;
			} else if (this.typeOf(args[i]) == "undefined")
				i++;
		}
		return result;
	},
	
	stringify: function (value) {
		if (this.typeOf(value) == "function")
			return "" + value;
		return JSON.stringify(value);
	}	

};
var Attach = {
		
	__namespace: "Scoped",
	
	upgrade: function (namespace) {
		var current = Globals.get(namespace || Attach.__namespace);
		if (current && Helper.typeOf(current) == "object" && current.guid == this.guid && Helper.typeOf(current.version) == "string") {
			var my_version = this.version.split(".");
			var current_version = current.version.split(".");
			var newer = false;
			for (var i = 0; i < Math.min(my_version.length, current_version.length); ++i) {
				newer = my_version[i] > current_version[i];
				if (my_version[i] != current_version[i]) 
					break;
			}
			return newer ? this.attach(namespace) : current;				
		} else
			return this.attach(namespace);		
	},

	attach : function(namespace) {
		if (namespace)
			Attach.__namespace = namespace;
		var current = Globals.get(Attach.__namespace);
		if (current == this)
			return this;
		Attach.__revert = current;
		Globals.set(Attach.__namespace, this);
		return this;
	},
	
	detach: function (forceDetach) {
		if (forceDetach)
			Globals.set(Attach.__namespace, null);
		if (typeof Attach.__revert != "undefined")
			Globals.set(Attach.__namespace, Attach.__revert);
		delete Attach.__revert;
		return this;
	},
	
	exports: function (mod, object, forceExport) {
		mod = mod || (typeof module != "undefined" ? module : null);
		if (typeof mod == "object" && mod && "exports" in mod && (forceExport || mod.exports == this || !mod.exports || Helper.isEmpty(mod.exports)))
			mod.exports = object || this;
		return this;
	}	

};

function newNamespace (options) {
	
	options = Helper.extend({
		tree: false,
		global: false,
		root: {}
	}, options);
	
	function initNode(options) {
		return Helper.extend({
			route: null,
			parent: null,
			children: {},
			watchers: [],
			data: {},
			ready: false,
			lazy: []
		}, options);
	}
	
	var nsRoot = initNode({ready: true});
	
	var treeRoot = null;
	
	if (options.tree) {
		if (options.global) {
			try {
				if (window)
					treeRoot = window;
			} catch (e) { }
			try {
				if (global)
					treeRoot = global;
			} catch (e) { }
		} else
			treeRoot = options.root;
		nsRoot.data = treeRoot;
	}
	
	function nodeDigest(node) {
		if (node.ready)
			return;
		if (node.parent && !node.parent.ready) {
			nodeDigest(node.parent);
			return;
		}
		if (node.route in node.parent.data) {
			node.data = node.parent.data[node.route];
			node.ready = true;
			for (var i = 0; i < node.watchers.length; ++i)
				node.watchers[i].callback.call(node.watchers[i].context || this, node.data);
			node.watchers = [];
			for (var key in node.children)
				nodeDigest(node.children[key]);
		}
	}
	
	function nodeEnforce(node) {
		if (node.ready)
			return;
		if (node.parent && !node.parent.ready)
			nodeEnforce(node.parent);
		node.ready = true;
		if (options.tree && typeof node.parent.data == "object")
			node.parent.data[node.route] = node.data;
		for (var i = 0; i < node.watchers.length; ++i)
			node.watchers[i].callback.call(node.watchers[i].context || this, node.data);
		node.watchers = [];
	}
	
	function nodeSetData(node, value) {
		if (typeof value == "object") {
			for (var key in value) {
				node.data[key] = value[key];
				if (node.children[key])
					node.children[key].data = value[key];
			}
		} else
			node.data = value;
		nodeEnforce(node);
		for (var k in node.children)
			nodeDigest(node.children[k]);
	}
	
	function nodeClearData(node) {
		if (node.ready && node.data) {
			for (var key in node.data)
				delete node.data[key];
		}
	}
	
	function nodeNavigate(path) {
		if (!path)
			return nsRoot;
		var routes = path.split(".");
		var current = nsRoot;
		for (var i = 0; i < routes.length; ++i) {
			if (routes[i] in current.children)
				current = current.children[routes[i]];
			else {
				current.children[routes[i]] = initNode({
					parent: current,
					route: routes[i]
				});
				current = current.children[routes[i]];
				nodeDigest(current);
			}
		}
		return current;
	}
	
	function nodeAddWatcher(node, callback, context) {
		if (node.ready)
			callback.call(context || this, node.data);
		else {
			node.watchers.push({
				callback: callback,
				context: context
			});
			if (node.lazy.length > 0) {
				var f = function (node) {
					if (node.lazy.length > 0) {
						var lazy = node.lazy.shift();
						lazy.callback.call(lazy.context || this, node.data);
						f(node);
					}
				};
				f(node);
			}
		}
	}

	return {
		
		extend: function (path, value) {
			nodeSetData(nodeNavigate(path), value);
		},
		
		set: function (path, value) {
			var node = nodeNavigate(path);
			if (node.data)
				nodeClearData(node);
			nodeSetData(node, value);
		},
		
		lazy: function (path, callback, context) {
			var node = nodeNavigate(path);
			if (node.ready)
				callback(context || this, node.data);
			else {
				node.lazy.push({
					callback: callback,
					context: context
				});
			}
		},
		
		digest: function (path) {
			nodeDigest(nodeNavigate(path));
		},
		
		obtain: function (path, callback, context) {
			nodeAddWatcher(nodeNavigate(path), callback, context);
		}
		
	};
	
}
function newScope (parent, parentNamespace, rootNamespace, globalNamespace) {
	
	var self = this;
	var nextScope = null;
	var childScopes = [];
	var localNamespace = newNamespace({tree: true});
	var privateNamespace = newNamespace({tree: false});
	
	var bindings = {
		"global": {
			namespace: globalNamespace
		}, "root": {
			namespace: rootNamespace
		}, "local": {
			namespace: localNamespace
		}, "default": {
			namespace: privateNamespace
		}, "parent": {
			namespace: parentNamespace
		}, "scope": {
			namespace: localNamespace,
			readonly: false
		}
	};
	
	var custom = function (argmts, name, callback) {
		var args = Helper.matchArgs(argmts, {
			options: "object",
			namespaceLocator: true,
			dependencies: "array",
			hiddenDependencies: "array",
			callback: true,
			context: "object"
		});
		
		var options = Helper.extend({
			lazy: this.options.lazy
		}, args.options || {});
		
		var ns = this.resolve(args.namespaceLocator);
		
		var execute = function () {
			this.require(args.dependencies, args.hiddenDependencies, function () {
				arguments[arguments.length - 1].ns = ns;
				if (this.options.compile) {
					var params = [];
					for (var i = 0; i < argmts.length; ++i)
						params.push(Helper.stringify(argmts[i]));
					this.compiled += this.options.ident + "." + name + "(" + params.join(", ") + ");\n\n";
				}
				var result = args.callback.apply(args.context || this, arguments);
				callback.call(this, ns, result);
			}, this);
		};
		
		if (options.lazy)
			ns.namespace.lazy(ns.path, execute, this);
		else
			execute.apply(this);

		return this;
	};
	
	return {
		
		getGlobal: Helper.method(Globals, Globals.getPath),
		setGlobal: Helper.method(Globals, Globals.setPath),
		
		options: {
			lazy: false,
			ident: "Scoped",
			compile: false			
		},
		
		compiled: "",
		
		nextScope: function () {
			if (!nextScope)
				nextScope = newScope(this, localNamespace, rootNamespace, globalNamespace);
			return nextScope;
		},
		
		subScope: function () {
			var sub = this.nextScope();
			childScopes.push(sub);
			nextScope = null;
			return sub;
		},
		
		binding: function (alias, namespaceLocator, options) {
			if (!bindings[alias] || !bindings[alias].readonly) {
				var ns;
				if (Helper.typeOf(namespaceLocator) != "string") {
					ns = {
						namespace: newNamespace({
							tree: true,
							root: namespaceLocator
						}),
						path: null	
					};
				} else
					ns = this.resolve(namespaceLocator);
				bindings[alias] = Helper.extend(options, ns);
			}
			return this;
		},
		
		resolve: function (namespaceLocator) {
			var parts = namespaceLocator.split(":");
			if (parts.length == 1) {
				return {
					namespace: privateNamespace,
					path: parts[0]
				};
			} else {
				var binding = bindings[parts[0]];
				if (!binding)
					throw ("The namespace '" + parts[0] + "' has not been defined (yet).");
				return {
					namespace: binding.namespace,
					path : binding.path && parts[1] ? binding.path + "." + parts[1] : (binding.path || parts[1])
				};
			}
		},
		
		define: function () {
			return custom.call(this, arguments, "define", function (ns, result) {
				ns.namespace.set(ns.path, result);
			});
		},
		
		extend: function () {
			return custom.call(this, arguments, "extend", function (ns, result) {
				ns.namespace.extend(ns.path, result);
			});
		},
		
		condition: function () {
			return custom.call(this, arguments, "condition", function (ns, result) {
				if (result)
					ns.namespace.set(ns.path, result);
			});
		},
		
		require: function () {
			var args = Helper.matchArgs(arguments, {
				dependencies: "array",
				hiddenDependencies: "array",
				callback: "function",
				context: "object"
			});
			args.callback = args.callback || function () {};
			var dependencies = args.dependencies || [];
			var allDependencies = dependencies.concat(args.hiddenDependencies || []);
			var count = allDependencies.length;
			var deps = [];
			var environment = {};
			if (count) {
				var f = function (value) {
					if (this.i < deps.length)
						deps[this.i] = value;
					count--;
					if (count === 0) {
						deps.push(environment);
						args.callback.apply(args.context || this.ctx, deps);
					}
				};
				for (var i = 0; i < allDependencies.length; ++i) {
					var ns = this.resolve(allDependencies[i]);
					if (i < dependencies.length)
						deps.push(null);
					ns.namespace.obtain(ns.path, f, {
						ctx: this,
						i: i
					});
				}
			} else {
				deps.push(environment);
				args.callback.apply(args.context || this, deps);
			}
			return this;
		},
		
		digest: function (namespaceLocator) {
			var ns = this.resolve(namespaceLocator);
			ns.namespace.digest(ns.path);
			return this;
		}		
		
	};
	
}
var globalNamespace = newNamespace({tree: true, global: true});
var rootNamespace = newNamespace({tree: true});
var rootScope = newScope(null, rootNamespace, rootNamespace, globalNamespace);

var Public = Helper.extend(rootScope, {
		
	guid: "4b6878ee-cb6a-46b3-94ac-27d91f58d666",
	version: '9.1427403679672',
		
	upgrade: Attach.upgrade,
	attach: Attach.attach,
	detach: Attach.detach,
	exports: Attach.exports
	
});

Public = Public.upgrade();
Public.exports();
	return Public;
}).call(this);
/*!
betajs-data - v1.0.0 - 2015-06-10
Copyright (c) Oliver Friedmann
MIT Software License.
*/
(function () {

var Scoped = this.subScope();

Scoped.binding("module", "global:BetaJS.Data");
Scoped.binding("base", "global:BetaJS");
Scoped.binding("json", "global:JSON");

Scoped.define("module:", function () {
	return {
		guid: "70ed7146-bb6d-4da4-97dc-5a8e2d23a23f",
		version: '27.1433976635853'
	};
});

Scoped.define("module:Queries.Constrained", [
                                             "json:",
                                             "module:Queries",
                                             "base:Types",
                                             "base:Objs",
                                             "base:Tokens",
                                             "base:Comparators"
                                             ], function (JSON, Queries, Types, Objs, Tokens, Comparators) {
	return {

		/*
		 * 
		 * { query: query, options: options }
		 * 
		 * options:
		 *  limit: int || null
		 *  skip: int || 0
		 *  sort: {
		 *    key1: 1 || -1,
		 *    key2: 1 || -1
		 *  }
		 * 
		 */

		rectify: function (constrainedQuery) {
			var base = ("options" in constrainedQuery || "query" in constrainedQuery) ? constrainedQuery : { query: constrainedQuery};
			return Objs.extend({
				query: {},
				options: {}
			}, base);
		},

		skipValidate: function (options, capabilities) {
			if ("skip" in options) {
				if (capabilities)
					return capabilities.skip;
			}
			return true;
		},

		limitValidate: function (options, capabilities) {
			if ("limit" in options) {
				if (capabilities)
					return capabilities.limit;
			}
			return true;
		},

		sortValidate: function (options, capabilities) {
			if ("sort" in options) {
				if (capabilities && !capabilities.sort)
					return false;
				if (capabilities && Types.is_object(capabilities.sort)) {
					var supported = Objs.all(options.sort, function (dummy, key) {
						return key in capabilities.sort;
					});
					if (!supported)
						return false;
				}
			}
			return true;
		},

		constraintsValidate: function (options, capabilities) {
			return Objs.all(["skip", "limit", "sort"], function (prop) {
				return this[prop + "Validate"].call(this, options, capabilities);
			}, this);
		},

		validate: function (constrainedQuery, capabilities) {
			constrainedQuery = this.rectify(constrainedQuery);
			return this.constraintsValidate(constrainedQuery.options, capabilities) && Queries.validate(constrainedQuery.query, capabilities.query || {});
		},

		fullConstrainedQueryCapabilities: function (queryCapabilties) {
			return {
				query: queryCapabilties || Queries.fullQueryCapabilities(),
				skip: true,
				limit: true,
				sort: true // can also be false OR a non-empty object containing keys which can be ordered by
			};
		},

		normalize: function (constrainedQuery) {
			constrainedQuery = this.rectify(constrainedQuery);
			return {
				query: Queries.normalize(constrainedQuery.query),
				options: constrainedQuery.options
			};
		},

		serialize: function (constrainedQuery) {
			return JSON.stringify(this.rectify(constrainedQuery));
		},

		unserialize: function (constrainedQuery) {
			return JSON.parse(constrainedQuery);
		},

		hash: function (constrainedQuery) {
			return Tokens.simple_hash(this.serialize(constrainedQuery));
		},

		subsumizes: function (constrainedQuery, constrainedQuery2) {
			constrainedQuery = this.rectify(constrainedQuery);
			constrainedQuery2 = this.rectify(constrainedQuery2);
			var qskip = constrainedQuery.options.skip || 0;
			var qskip2 = constrainedQuery2.options.skip || 0;
			var qlimit = constrainedQuery.options.limit || null;
			var qlimit2 = constrainedQuery2.options.limit || null;
			var qsort = constrainedQuery.options.sort;
			var qsort2 = constrainedQuery.options.sort;
			if (qskip > qskip2)
				return false;
			if (qlimit) {
				if (!qlimit2)
					return false;
				if (qlimit2 + qskip2 > qlimit + qskip)
					return false;
			}
			if ((qskip || qlimit) && (qsort || qsort2) && JSON.stringify(qsort) != JSON.stringify(qsort2))
				return false;
			return Queries.subsumizes(constrainedQuery.query, constrainedQuery2.query);
		},

		mergeable: function (constrainedQuery, constrainedQuery2) {
			constrainedQuery = this.rectify(constrainedQuery);
			constrainedQuery2 = this.rectify(constrainedQuery2);
			if (Queries.serialize(constrainedQuery.query) != Queries.serialize(constrainedQuery2.query))
				return false;
			var qopts = constrainedQuery.options;
			var qopts2 = constrainedQuery2.options;
			if (JSON.stringify(qopts.sort || {}) != JSON.stringify(qopts2.sort || {}))
				return false;
			if ("skip" in qopts) {
				if ("skip" in qopts2) {
					if (qopts.skip <= qopts2.skip)
						return !qopts.limit || (qopts.skip + qopts.limit >= qopts2.skip);
					else
						return !qopts2.limit || (qopts2.skip + qopts2.limit >= qopts.skip);
				} else 
					return (!qopts2.limit || (qopts2.limit >= qopts.skip));
			} else 
				return !("skip" in qopts2) || (!qopts.limit || (qopts.limit >= qopts2.skip));
		},

		merge: function (constrainedQuery, constrainedQuery2) {
			constrainedQuery = this.rectify(constrainedQuery);
			constrainedQuery2 = this.rectify(constrainedQuery2);
			var qopts = constrainedQuery.options;
			var qopts2 = constrainedQuery2.options;
			return {
				query: constrainedQuery.query,
				options: {
					skip: "skip" in qopts ? ("skip" in qopts2 ? Math.min(qopts.skip, qopts2.skip): null) : null,
							limit: "limit" in qopts ? ("limit" in qopts2 ? Math.max(qopts.limit, qopts2.limit): null) : null,
									sort: constrainedQuery.sort
				}
			};
		}


	}; 
});
Scoped.define("module:Queries", [
                                 "json:",
                                 "base:Types",
                                 "base:Sort",
                                 "base:Objs",
                                 "base:Class",
                                 "base:Tokens",
                                 "base:Iterators.ArrayIterator",
                                 "base:Iterators.FilteredIterator",
                                 "base:Strings",
                                 "base:Comparators"
                                 ], function (JSON, Types, Sort, Objs, Class, Tokens, ArrayIterator, FilteredIterator, Strings, Comparators) {

	var SYNTAX_PAIR_KEYS = {
			"$or": {
				evaluate_combine: Objs.exists
			},
			"$and": {
				evaluate_combine: Objs.all
			}
	};

	var SYNTAX_CONDITION_KEYS = {
			"$in": {
				target: "atoms",
				evaluate_combine: Objs.exists,
				evaluate_single: function (object_value, condition_value) {
					return object_value === condition_value;
				}
			}, "$gt": {
				target: "atom",
				evaluate_single: function (object_value, condition_value) {
					return object_value > condition_value;
				}
			}, "$lt": {
				target: "atom",
				evaluate_single: function (object_value, condition_value) {
					return object_value < condition_value;
				}
			}, "$gte": {
				target: "atom",
				evaluate_single: function (object_value, condition_value) {
					return object_value >= condition_value;
				}
			}, "$le": {
				target: "atom",
				evaluate_single: function (object_value, condition_value) {
					return object_value <= condition_value;
				}
			}, "$sw": {
				target: "atom",
				evaluate_single: function (object_value, condition_value) {
					return object_value === condition_value || (Types.is_string(object_value) && object_value.indexOf(condition_value) === 0);
				}
			}, "$ct": {
				target: "atom",
				no_index_support: true,
				evaluate_single: function (object_value, condition_value) {
					return object_value === condition_value || (Types.is_string(object_value) && object_value.indexOf(condition_value) >= 0);
				}
			}, "$eq": {
				target: "atom",
				evaluate_single: function (object_value, condition_value) {
					return object_value === condition_value;
				}
			}
	};

	Objs.iter(Objs.clone(SYNTAX_CONDITION_KEYS, 1), function (value, key) {
		var valueic = Objs.clone(value, 1);
		valueic.evaluate_single = function (object_value, condition_value) {
			return value.evaluate_single(object_value.toLowerCase(), condition_value.toLowerCase());
		};
		valueic.ignore_case = true;
		SYNTAX_CONDITION_KEYS[key + "ic"] = valueic;
	});


	return {		

		/*
		 * Syntax:
		 *
		 * atoms :== [atom, ...]
		 * atom :== string | int | bool | float
		 * queries :== [query, ...]
		 * query :== {pair, ...}
		 * pair :== key: value | $or : queries | $and: queries
		 * value :== atom | conditions
		 * conditions :== {condition, ...}  
		 * condition :== $in: atoms | $gt: atom | $lt: atom | $gte: atom | $le: atom | $sw: atom | $ct: atom | all with ic
		 *
		 */

		SYNTAX_PAIR_KEYS: SYNTAX_PAIR_KEYS,

		SYNTAX_CONDITION_KEYS: SYNTAX_CONDITION_KEYS,

		validate: function (query, capabilities) {
			return this.validate_query(query, capabilities);
		},

		validate_atoms: function (atoms, capabilities) {
			return Types.is_array(atoms) && Objs.all(atoms, function (atom) {
				return this.validate_atom(atom, capabilities);
			}, this);
		},

		validate_atom: function (atom, capabilities) {
			return !capabilities || !!capabilities.atom; 
		},

		validate_queries: function (queries, capabilities) {
			return Types.is_array(queries) && Objs.all(queries, function (query) {
				return this.validate_query(query, capabilities);
			}, this);
		},

		validate_query: function (query, capabilities) {
			return Types.is_object(query) && Objs.all(query, function (value, key) {
				return this.validate_pair(value, key, capabilities);
			}, this);
		},

		validate_pair: function (value, key, capabilities) {
			if (key in this.SYNTAX_PAIR_KEYS) {
				if (capabilities && (!capabilities.bool || !(key in capabilities.bool)))
					return false;
				return this.validate_queries(value, capabilities);
			}
			return this.validate_value(value, capabilities);
		},

		is_query_atom: function (value) {
			return value === null || !Types.is_object(value) || Objs.all(value, function (v, key) {
				return !(key in this.SYNTAX_CONDITION_KEYS);
			}, this);
		},

		validate_value: function (value, capabilities) {
			return !this.is_query_atom(value) ? this.validate_conditions(value, capabilities) : this.validate_atom(value, capabilities);
		},

		validate_conditions: function (conditions, capabilities) {
			return Types.is_object(conditions) && Objs.all(conditions, function (value, key) {
				return this.validate_condition(value, key, capabilities);
			}, this);
		},

		validate_condition: function (value, key, capabilities) {
			if (capabilities && (!capabilities.conditions || !(key in capabilities.conditions)))
				return false;
			var meta = this.SYNTAX_CONDITION_KEYS[key];
			return meta && (meta.target === "atoms" ? this.validate_atoms(value) : this.validate_atom(value));
		},

		normalize: function (query) {
			return Sort.deep_sort(query);
		},

		serialize: function (query) {
			return JSON.stringify(query);
		},

		unserialize: function (query) {
			return JSON.parse(query);
		},

		hash: function (query) {
			return Tokens.simple_hash(this.serialize(query));
		},

		dependencies: function (query) {
			return Objs.keys(this.dependencies_query(query, {}));
		},

		dependencies_queries: function (queries, dep) {
			Objs.iter(queries, function (query) {
				dep = this.dependencies_query(query, dep);
			}, this);
			return dep;
		},

		dependencies_query: function (query, dep) {
			Objs.iter(query, function (value, key) {
				dep = this.dependencies_pair(value, key, dep);
			}, this);
			return dep;
		},

		dependencies_pair: function (value, key, dep) {
			return key in this.SYNTAX_PAIR_KEYS ? this.dependencies_queries(value, dep) : this.dependencies_key(key, dep);
		},

		dependencies_key: function (key, dep) {
			dep[key] = (dep[key] || 0) + 1;
			return dep;
		},

		evaluate : function(query, object) {
			return this.evaluate_query(query, object);
		},

		evaluate_query: function (query, object) {
			return Objs.all(query, function (value, key) {
				return this.evaluate_pair(value, key, object);
			}, this);
		},

		evaluate_pair: function (value, key, object) {
			if (key in this.SYNTAX_PAIR_KEYS) {
				return this.SYNTAX_PAIR_KEYS[key].evaluate_combine.call(Objs, value, function (query) {
					return this.evaluate_query(query, object);
				}, this);
			} else
				return this.evaluate_value(value, object[key]);
		},

		evaluate_value: function (value, object_value) {
			return !this.is_query_atom(value) ? this.evaluate_conditions(value, object_value) : this.evaluate_atom(value, object_value);
		},

		evaluate_atom: function (value, object_value) {
			return value === object_value;
		},

		evaluate_conditions: function (value, object_value) {
			return Objs.all(value, function (condition_value, condition_key) {
				return this.evaluate_condition(condition_value, condition_key, object_value);
			}, this);
		},

		evaluate_condition: function (condition_value, condition_key, object_value) {
			var rec = this.SYNTAX_CONDITION_KEYS[condition_key];
			if (rec.target === "atoms") {
				return rec.evaluate_combine.call(Objs, condition_value, function (condition_single_value) {
					return rec.evaluate_single.call(this, object_value, condition_single_value);
				}, this);
			}
			return rec.evaluate_single.call(this, object_value, condition_value);
		},

		subsumizes: function (query, query2) {
			// This is very simple at this point
			if (!Types.is_object(query) || !Types.is_object)
				return query == query2;
			for (var key in query) {
				if (!(key in query2) || !this.subsumizes(query[key], query2[key]))
					return false;
			}
			return true;
		},

		fullQueryCapabilities: function () {
			var bool = {};
			Objs.iter(this.SYNTAX_PAIR_KEYS, function (dummy, key) {
				bool[key] = true;
			});
			var conditions = {};
			Objs.iter(this.SYNTAX_CONDITION_KEYS, function (dummy, key) {
				conditions[key] = true;
			});
			return {
				atom: true,
				bool: bool,
				conditions: conditions
			};
		},

		mergeConditions: function (conditions1, conditions2) {
			if (!Types.is_object(conditions1))
				conditions1 = {"$eq": conditions1 };
			if (!Types.is_object(conditions2))
				conditions2 = {"$eq": conditions2 };
			var fail = false;
			var obj = Objs.clone(conditions1, 1);
			Objs.iter(conditions2, function (target, condition) {
				if (fail)
					return false;
				if (condition in obj) {
					var base = obj[condition];
					if (Strings.starts_with(condition, "$eq")) 
						fail = true;
					if (Strings.starts_with(condition, "$in")) {
						base = Objs.objectify(base);
						obj[condition] = [];
						fail = true;
						Objs.iter(target, function (x) {
							if (base[x]) {
								obj[condition].push(x);
								fail = false;
							}
						});
					}
					if (Strings.starts_with(condition, "$sw")) {
						if (Strings.starts_with(base, target))
							obj[condition] = target;
						else if (!Strings.starts_with(target, base))
							fail = true;
					}
					if (Strings.starts_with(condition, "$gt"))
						if (Comparators.byValue(base, target) < 0)
							obj[condition] = target;
					if (Strings.starts_with(condition, "$lt"))
						if (Comparators.byValue(base, target) > 0)
							obj[condition] = target;
				} else
					obj[condition] = target;
			}, this);
			if (fail)
				obj = {"$in": []};
			return obj;
		},

		disjunctiveNormalForm: function (query, mergeKeys) {
			query = Objs.clone(query, 1);
			var factors = [];
			if (query.$or) {
				var factor = [];
				Objs.iter(query.$or, function (q) {
					Objs.iter(this.disjunctiveNormalForm(q, mergeKeys).$or, function (q2) {
						factor.push(q2);
					}, this);
				}, this);
				factors.push(factor);
				delete query.$or;
			}
			if (query.$and) {
				Objs.iter(query.$and, function (q) {
					var factor = [];
					Objs.iter(this.disjunctiveNormalForm(q, mergeKeys).$or, function (q2) {
						factor.push(q2);
					}, this);
					factors.push(factor);
				}, this);
				delete query.$and;
			}
			var result = [];
			var helper = function (base, i) {
				if (i < factors.length) {
					Objs.iter(factors[i], function (factor) {
						var target = Objs.clone(base, 1);
						Objs.iter(factor, function (value, key) {
							if (key in target) {
								if (mergeKeys)
									target[key] = this.mergeConditions(target[key], value);
								else {
									if (!target.$and)
										target.$and = [];
									target.$and.push(Objs.objectBy(key, value));
								}
							} else
								target[key] = value;
						}, this);
						helper(target, i + 1);
					}, this);
				} else
					result.push(base);
			};
			helper(query, 0);
			return {"$or": result};
		},

		simplifyQuery: function (query) {
			var result = {};
			Objs.iter(query, function (value, key) {
				if (key in this.SYNTAX_PAIR_KEYS) {
					var arr = [];
					var had_true = false;
					Objs.iter(value, function (q) {
						var qs = this.simplifyQuery(q);
						if (Types.is_empty(qs))
							had_true = true;
						else
							arr.push(qs);
					}, this);
					if ((key === "$and" && arr.length > 0) || (key === "$or" && !had_true))
						result[key] = arr;
				} else {
					var conds = this.simplifyConditions(value);
					if (!Types.is_empty(conds))
						result[key] = conds;
				}
			}, this);
			return result;
		},

		simplifyConditions: function (conditions) {
			var result = {};
			Objs.iter(["", "ic"], function (add) {
				if (conditions["$eq" + add] || conditions["$in" + add]) {
					var filtered = Objs.filter(conditions["$eq" + add] ? [conditions["$eq" + add]] : conditions["$in" + add], function (inkey) {
						return this.evaluate_conditions(conditions, inkey);
					}, this);
					result[(filtered.length === 1 ? "$eq" : "$in") + add] = filtered.length === 1 ? filtered[0] : filtered;
				} else {
					var gt = null;
					var lt = null;
					var lte = false;
					var gte = false;
					var compare = Comparators.byValue;
					if (conditions["$gt" + add])
						gt = conditions["$gt" + add];
					if (conditions["$lt" + add])
						gt = conditions["$lt" + add];
					if (conditions["$gte" + add] && (gt === null || compare(gt, conditions["$gte" + add]) < 0)) {
						gte = true;
						gt = conditions["$gte" + add];
					}
					if (conditions["$lte" + add] && (lt === null || compare(lt, conditions["$lte" + add]) > 0)) {
						lte = true;
						lt = conditions["$lte" + add];
					}
					if (conditions["$sw" + add]) {
						var s = conditions["$sw" + add];
						if (gt === null || compare(gt, s) <= 0) {
							gte = true;
							gt = s;
						}
						var swnext = null;
						if (typeof(s) === 'number')
							swnext = s + 1;
						else if (typeof(s) === 'string' && s.length > 0)
							swnext = s.substring(0, s.length - 1) + String.fromCharCode(s.charCodeAt(s.length - 1) + 1);
						if (swnext !== null && (lt === null || compare(lt, swnext) >= 0)) {
							lte = true;
							lt = swnext;
						}
					}				
					if (lt !== null)
						result[(lte ? "$lte" : "$lt") + add] = lt;
					if (gt !== null)
						result[(gte ? "$gte" : "$gt") + add] = gt;
					if (conditions["$ct" + add])
						result["$ct" + add] = conditions["$ct" + add];
				}
			}, this);
			return result;
		}

	}; 
});
Scoped.define("module:Queries.Engine", [
                                        "module:Queries",
                                        "module:Queries.Constrained",
                                        "base:Strings",
                                        "base:Types",
                                        "base:Objs",
                                        "base:Promise",
                                        "base:Comparators",
                                        "base:Iterators.SkipIterator",
                                        "base:Iterators.LimitIterator",
                                        "base:Iterators.SortedIterator",
                                        "base:Iterators.FilteredIterator",
                                        "base:Iterators.SortedOrIterator",
                                        "base:Iterators.PartiallySortedIterator",
                                        "base:Iterators.ArrayIterator",
                                        "base:Iterators.LazyMultiArrayIterator"
                                        ], function (Queries, Constrained, Strings, Types, Objs, Promise, Comparators, SkipIterator, LimitIterator, SortedIterator, FilteredIterator, SortedOrIterator, PartiallySortedIterator, ArrayIterator, LazyMultiArrayIterator) {
	return {

		indexQueryConditionsSize: function (conds, index, ignoreCase) {
			var add = ignoreCase ? "ic" : "";
			var postfix = ignoreCase ? "_ic" : "";
			var info = index.info();
			var subSize = info.row_count;
			var rows_per_key = info.row_count / Math.max(info["key_count" + postfix], 1);
			if (conds["$eq" + add])
				subSize = rows_per_key;
			else if (conds["$in" + add])
				subSize = rows_per_key * conds["$in" + add].length;
			else {
				var keys = 0;
				var g = null;
				if (conds["$gt" + add] || conds["$gte" + add]) {
					g = conds["$gt" + add] || conds["$gte" + add];
					if (conds["$gt" + add])
						keys--;
				}
				var l = null;
				if (conds["$lt" + add] || conds["$lte" + add]) {
					l = conds["$lt" + add] || conds["$lte" + add];
					if (conds["$lt" + add])
						keys--;
				}
				if (g !== null && l !== null)
					keys += index["key_count_distance" + postfix](g, l);						
				else if (g !== null)
					keys += index["key_count_right" + postfix](g);
				else if (l !== null)
					keys += index["key_count_left" + postfix](l);
				subSize = keys * rows_per_key;
			}
			return subSize;
		},

		indexQuerySize: function (queryDNF, key, index) {
			var acc = 0;
			var info = index.info();
			Objs.iter(queryDNF.$or, function (q) {
				if (!(key in q)) {
					acc = null;
					return false;
				}
				var conds = q[key];
				var findSize = info.row_count;
				if (index.options().exact)
					findSize = Math.min(findSize, this.indexQueryConditionsSize(conds, index, false));
				if (index.options().ignoreCase)
					findSize = Math.min(findSize, this.indexQueryConditionsSize(conds, index, true));
				acc += findSize;
			}, this);
			return acc;
		},

		queryPartially: function (constrainedQuery, constrainedQueryCapabilities) {
			var simplified = {
					query: constrainedQuery.query,
					options: {}
			};
			if (constrainedQuery.options.sort) {
				var first = Objs.ithKey(constrainedQuery.options.sort, 0);
				simplified.options.sort = {};
				simplified.options.sort[first] = constrainedQuery.options.sort[first];
			}
			return Constrained.validate(simplified, constrainedQueryCapabilities);
		},

		compileQuery: function (constrainedQuery, constrainedQueryCapabilities, constrainedQueryFunction, constrainedQueryContext) {
			constrainedQuery = Constrained.rectify(constrainedQuery);
			var sorting_supported = Constrained.sortValidate(constrainedQuery.options, constrainedQueryCapabilities);
			var query_supported = Queries.validate(constrainedQuery.query, constrainedQueryCapabilities.query || {});
			var skip_supported = Constrained.skipValidate(constrainedQuery.options, constrainedQueryCapabilities);
			var limit_supported = Constrained.limitValidate(constrainedQuery.options, constrainedQueryCapabilities);
			var post_actions = {
					skip: null,
					limit: null,
					filter: null,
					sort: null
			};
			if (!query_supported || !sorting_supported || !skip_supported) {
				post_actions.skip = constrainedQuery.options.skip;
				delete constrainedQuery.options.skip;
				if ("limit" in constrainedQuery.options && limit_supported && query_supported && sorting_supported)
					constrainedQuery.options.limit += post_actions.skip;
			}
			if (!query_supported || !sorting_supported || !limit_supported) {
				post_actions.limit = constrainedQuery.options.limit;
				delete constrainedQuery.options.limit;
			}
			if (!sorting_supported) {
				post_actions.sort = constrainedQuery.options.sort;
				delete constrainedQuery.options.sort;
			}
			if (!query_supported) {
				post_actions.filter = constrainedQuery.query;
				constrainedQuery.query = {};
			}
			var query_result = constrainedQueryFunction.call(constrainedQueryContext, constrainedQuery);
			return query_result.mapSuccess(function (iter) {
				iter = this._queryResultRectify(iter, false);
				if (post_actions.filter)
					iter = new FilteredIterator(iter, function(row) {
						return Queries.evaluate(post_actions.filter, row);
					});
				if (post_actions.sort)
					iter = new SortedIterator(iter, Comparators.byObject(post_actions.sort));
				if (post_actions.skip)
					iter = new SkipIterator(iter, post_actions.skip);
				if (post_actions.limit)
					iter = new LimitIterator(iter, post_actions.limit);
				return iter;
			}, this);
		},

		compileIndexQuery: function (constrainedDNFQuery, key, index) {
			var fullQuery = Objs.exists(constrainedDNFQuery.query.$or, function (query) {
				return !(key in query);
			});
			var primaryKeySort = constrainedDNFQuery.options.sort && Objs.ithKey(constrainedDNFQuery.options.sort, 0) === key;
			var primarySortDirection = primaryKeySort ? constrainedDNFQuery.options.sort[key] : 1;
			var iter;
			var ignoreCase = !index.options().exact;
			if (fullQuery) {
				var materialized = [];
				index["itemIterate" + (ignoreCase ? "_ic" : "")](null, primarySortDirection, function (dataKey, data) {
					materialized.push(data);
				});
				iter = new ArrayIterator(materialized);
			} else {
				iter = new SortedOrIterator(Objs.map(constrainedDNFQuery.query.$or, function (query) {
					var conds = query[key];
					if (!primaryKeySort && index.options().ignoreCase && index.options().exact) {
						if (this.indexQueryConditionsSize(conds, index, true) < this.indexQueryConditionsSize(conds, index, false))
							ignoreCase = true;
					}
					var add = ignoreCase ? "ic" : "";
					var postfix = ignoreCase ? "_ic" : "";
					if (conds["$eq" + add]) {
						var materialized = [];
						index["itemIterate" + postfix](conds["$eq" + add], primarySortDirection, function (dataKey, data) {
							if (dataKey !== conds["$eq" + add])
								return false;
							materialized.push(data);
						});
						iter = new ArrayIterator(materialized);
					} else if (conds["$in" + add]) {
						var i = 0;
						iter = new LazyMultiArrayIterator(function () {
							if (i >= conds["$in" + add].length)
								return null;
							var materialized = [];
							index["itemIterate" + postfix](conds["$in" + add][i], primarySortDirection, function (dataKey, data) {
								if (dataKey !== conds["in" + add][i])
									return false;
								materialized.push(data);
							});
							i++;
							return materialized;
						});
					} else {
						var currentKey = null;
						var lastKey = null;
						if (conds["$gt" + add] || conds["$gte" + add])
							currentKey = conds["$gt" + add] || conds["$gte" + add];
						if (conds["$lt" + add] || conds["$lte" + add])
							lastKey = conds["$lt" + add] || conds["$lte" + add];
						if (primarySortDirection < 0) {
							var temp = currentKey;
							currentKey = lastKey;
							lastKey = temp;
						}
						iter = new LazyMultiArrayIterator(function () {
							if (currentKey !== null && lastKey !== null) {
								if (Math.sign((index.comparator())(currentKey, lastKey)) === Math.sign(primarySortDirection))
									return null;
							}
							index["itemIterate" + postfix](currentKey, primarySortDirection, function (dataKey, data) {
								if (currentKey === null)
									currentKey = dataKey;
								if (dataKey !== currentKey) {
									currentKey = dataKey;
									return false;
								}
								materialized.push(data);
							});
							return materialized;
						});
					}
					return iter;
				}, this), index.comparator());
			}
			iter = new FilteredIterator(iter, function (row) {
				return Queries.evaluate(constrainedDNFQuery.query, row);
			});
			if (constrainedDNFQuery.options.sort) {
				if (primaryKeySort)
					iter = new PartiallySortedIterator(iter, Comparators.byObject(constrainedDNFQuery.options.sort), function (first, next) {
						return first[key] === next[key];
					});
				else
					iter = new SortedIterator(iter, Comparators.byObject(constrainedDNFQuery.options.sort));
			}
			if (constrainedDNFQuery.options.skip)
				iter = new SkipIterator(iter, constrainedDNFQuery.options.skip);
			if (constrainedDNFQuery.options.limit)
				iter = new LimitIterator(iter, constrainedDNFQuery.options.limit);
			return Promise.value(iter);
		},

		compileIndexedQuery: function (constrainedQuery, constrainedQueryCapabilities, constrainedQueryFunction, constrainedQueryContext, indices) {
			constrainedQuery = Constrained.rectify(constrainedQuery);
			indices = indices || {};
			if (this.queryPartially(constrainedQuery, constrainedQueryCapabilities) || Types.is_empty(indices))
				return this.compileQuery(constrainedQuery, constrainedQueryCapabilities, constrainedQueryFunction, constrainedQueryContext);
			if (constrainedQuery.options.sort) {
				var first = Objs.ithKey(constrainedQuery.options.sort, 0);
				if (indices[first]) {
					return this.compileIndexQuery({
						query: Queries.simplifyQuery(Queries.disjunctiveNormalForm(constrainedQuery.query, true)),
						options: constrainedQuery.options
					}, first, indices[first]);
				}
			}
			var dnf = Queries.simplifyQuery(Queries.disjunctiveNormalForm(constrainedQuery.query, true));
			var smallestSize = null;
			var smallestKey = null;
			Objs.iter(indices, function (index, key) {
				var size = this.indexQuerySize(dnf, key, index);
				if (size !== null && (smallestSize === null || size < smallestSize)) {
					smallestSize = size;
					smallestKey = key;
				}
			}, this);
			if (smallestKey !== null)
				return this.compileIndexQuery({
					query: dnf,
					options: constrainedQuery.options
				}, smallestKey, indices[smallestKey]);
			else
				return this.compileQuery(constrainedQuery, constrainedQueryCapabilities, constrainedQueryFunction, constrainedQueryContext);
		},

		_queryResultRectify: function (result, materialize) {
			result = result || [];
			return Types.is_array(result) == materialize ? result : (materialize ? result.asArray() : new ArrayIterator(result)); 
		}

	}; 
});



Scoped.define("module:Stores.AssocStore", [
                                           "module:Stores.BaseStore",
                                           "base:Promise",
                                           "base:Objs"
                                           ], function (BaseStore, Promise, Objs, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			_read_key: function (key) {},
			_write_key: function (key, value) {},
			_remove_key: function (key) {},
			_iterate: function () {},

			constructor: function (options) {
				options = options || {};
				options.create_ids = true;
				inherited.constructor.call(this, options);
			},

			_insert: function (data) {
				return Promise.tryCatch(function () {
					this._write_key(data[this._id_key], data);
					return data;
				}, this);
			},

			_remove: function (id) {
				return Promise.tryCatch(function () {
					var row = this._read_key(id);
					if (row && !this._remove_key(id))
						return null;
					return row;
				}, this);
			},

			_get: function (id) {
				return Promise.tryCatch(function () {
					return this._read_key(id);
				}, this);
			},

			_update: function (id, data) {
				return Promise.tryCatch(function () {
					var row = this._read_key(id);
					if (row) {
						if (this._id_key in data) {
							this._remove_key(id);
							id = data[this._id_key];
							delete data[this._id_key];
						}
						Objs.extend(row, data);
						this._write_key(id, row);
					}
					return row;
				}, this);
			},

			_query: function (query, options) {
				return Promise.tryCatch(function () {
					return this._iterate();
				}, this);
			}

		};
	});
});

//Stores everything temporarily in the browser's memory

Scoped.define("module:Stores.MemoryStore", [
                                            "module:Stores.AssocStore",
                                            "base:Iterators.ObjectValuesIterator"
                                            ], function (AssocStore, ObjectValuesIterator, scoped) {
	return AssocStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (options) {
				inherited.constructor.call(this, options);
				this.__data = {};
			},

			_read_key: function (key) {
				return this.__data[key];
			},

			_write_key: function (key, value) {
				this.__data[key] = value;
			},

			_remove_key: function (key) {
				delete this.__data[key];
			},

			_iterate: function () {
				return new ObjectValuesIterator(this.__data);
			}

		};
	});
});

Scoped.define("module:Stores.BaseStore", [
                                          "base:Class",
                                          "base:Events.EventsMixin",
                                          "module:Stores.ReadStoreMixin",
                                          "module:Stores.WriteStoreMixin",
                                          "base:Promise"
                                          ], function (Class, EventsMixin, ReadStoreMixin, WriteStoreMixin, Promise, scoped) {
	return Class.extend({scoped: scoped}, [EventsMixin, ReadStoreMixin, WriteStoreMixin, function (inherited) {			
		return {

			constructor: function (options) {
				inherited.constructor.call(this);
				this._initializeReadStore(options);
				this._initializeWriteStore(options);
			},

			_ensure_index: function (key) {
			},

			ensure_index: function (key) {
				return this._ensure_index(key);
			},

			clear: function () {
				return this.query().mapSuccess(function (iter) {
					var promise = Promise.and();
					while (iter.hasNext()) {
						var obj = iter.next();
						promise = promise.and(this.remove(obj[this._id_key]));
					}
					return promise;
				}, this);
			}

		};
	}]);
});

Scoped.define("module:Stores.ReadStoreMixin", [
                                               "module:Queries.Engine",
                                               "module:Stores.StoreException",                                               
                                               "base:Promise",
                                               "base:Objs"
                                               ], function (QueryEngine, StoreException, Promise, Objs) {
	return {

		_initializeReadStore: function (options) {
			options = options || {};
			this._query_model = "query_model" in options ? options.query_model : null;
			this.indices = {};
		},

		query_model: function () {
			if (arguments.length > 0)
				this._query_model = arguments[0];
			return this._query_model;
		},

		_get: function (id) {
			return Promise.create(null, new StoreException("unsupported: get"));
		},

		_query_capabilities: function () {
			return {};
		},

		_query: function (query, options) {
			return Promise.create(null, new StoreException("unsupported: query"));
		},

		get: function (id) {
			return this._get(id);
		},

		query: function (query, options) {
			query = Objs.clone(query, -1);
			options = Objs.clone(options, -1);
			if (options) {
				if (options.limit)
					options.limit = parseInt(options.limit, 10);
				if (options.skip)
					options.skip = parseInt(options.skip, 10);
			}
			if (this._query_model) {
				var subsumizer = this._query_model.subsumizer_of({query: query, options: options});
				if (!subsumizer) {
					this.trigger("query_miss", {query: query, options: options});
					return Promise.error(new StoreException("Cannot execute query"));
				}
				this.trigger("query_hit", {query: query, options: options}, subsumizer);
			}
			return QueryEngine.compileIndexedQuery(
					{query: query, options: options || {}},
					this._query_capabilities(),
					function (constrainedQuery) {
						return this._query(constrainedQuery.query, constrainedQuery.options);
					},
					this,
					this.indices);
		}

	};
});


Scoped.define("module:Stores.ReadStore", [
                                          "base:Class",
                                          "module:Stores.ReadStoreMixin"
                                          ], function (Class, ReadStoreMixin, scoped) {
	return Class.extend({scoped: scoped}, [ReadStoreMixin, function (inherited) {			
		return {

			constructor: function (options) {
				inherited.constructor.call(this);
				this._initializeReadStore(options);
			}

		};
	}]);
});


Scoped.define("module:Stores.StoreException", ["base:Exceptions.Exception"], function (Exception, scoped) {
	return Exception.extend({scoped: scoped}, {});
});

Scoped.define("module:Stores.StoreHistory", [
                                             "base:Class",
                                             "base:Objs",
                                             "base:Types",
                                             "module:Stores.MemoryStore"
                                             ], function (Class, Objs, Types, MemoryStore, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (sourceStore, historyStore, options) {
				inherited.constructor.call(this);
				this._options = Objs.extend({
					combine_update_update: false,
					combine_insert_update: false,
					combine_insert_remove: false,
					combine_update_remove: false,
					source_id_key: sourceStore ? sourceStore.id_key() : "id",
							row_data: {},
							filter_data: {}
				}, options);
				this.historyStore = historyStore || new MemoryStore();
				this.commitId = 1;
				if (sourceStore) {
					sourceStore.on("insert", this.sourceInsert, this);
					sourceStore.on("remove", this.sourceRemove, this);
					sourceStore.on("update", this.sourceUpdate, this);
				}
			},

			sourceInsert: function (data) {
				this.commitId++;
				this.historyStore.insert(Objs.extend({
					row: data,
					type: "insert",
					row_id: data[this._options.source_id_key],
					commit_id: this.commitId
				}, this._options.row_data));
			},

			sourceUpdate: function (row, data) {
				this.commitId++;
				var row_id = Types.is_object(row) ? row[this._options.source_id_key] : row;
				var target_type = "update";
				if (this._options.combine_insert_update || this._options.combine_update_update) {
					var types = [];
					if (this._options.combine_insert_update)
						types.push("insert");
					if (this._options.combine_update_update)
						types.push("update");
					var combined_data = {};
					var delete_ids = [];
					var iter = this.historyStore.query(Objs.extend({
						type: {"$or": types},
						row_id: row_id
					}, this._options.filter_data), {sort: {commit_id: 1}}).value();
					while (iter.hasNext()) {
						var itemData = iter.next();
						if (itemData.type === "insert")
							target_type = "insert";
						combined_data = Objs.extend(combined_data, itemData.row);
						delete_ids.push(this.historyStore.id_of(itemData));
					}
					data = Objs.extend(combined_data, data);
					Objs.iter(delete_ids, this.historyStore.remove, this.historyStore);
				}
				this.historyStore.insert(Objs.extend({
					row: data,
					type: target_type,
					row_id: row_id,
					commit_id: this.commitId
				}, this._options.row_data));
			},

			sourceRemove: function (id) {
				this.commitId++;
				if (this._options.combine_insert_remove) {
					if (this.historyStore.query(Objs.extend({
						type: "insert",
						row_id: id
					}, this._options.filter_data)).value().hasNext()) {
						var iter = this.historyStore.query(Objs.extend({
							row_id: id
						}, this._options.filter_data)).value();
						while (iter.hasNext())
							this.historyStore.remove(this.historyStore.id_of(iter.next()));
						return;
					}
				}
				if (this._options.combine_update_remove) {
					var iter2 = this.historyStore.query(Objs.extend({
						type: "update",
						row_id: id
					}, this._options.filter_data)).value();
					while (iter2.hasNext())
						this.historyStore.remove(this.historyStore.id_of(iter2.next()));
				}
				this.historyStore.insert(Objs.extend({
					type: "remove",
					row_id: id,
					commit_id: this.commitId
				}, this._options.row_data));
			}

		};
	});
});

Scoped.define("module:Stores.WriteStoreMixin", [
                                                "module:Stores.StoreException",                                               
                                                "base:Promise",
                                                "base:Classes.TimedIdGenerator",
                                                "base:Types"
                                                ], function (StoreException, Promise, TimedIdGenerator, Types) {
	return {

		_initializeWriteStore: function (options) {
			options = options || {};
			this._id_key = options.id_key || "id";
			this._create_ids = options.create_ids || false;
			if (this._create_ids)
				this._id_generator = options.id_generator || this._auto_destroy(new TimedIdGenerator());
			this._query_model = "query_model" in options ? options.query_model : null;
		},

		query_model: function () {
			if (arguments.length > 0)
				this._query_model = arguments[0];
			return this._query_model;
		},

		id_key: function () {
			return this._id_key;
		},

		id_of: function (row) {
			return row[this.id_key()];
		},

		_inserted: function (row, event_data) {
			this.trigger("insert", row, event_data);		
			this.trigger("write", "insert", row, event_data);
		},

		_removed: function (id, event_data) {
			this.trigger("remove", id, event_data);
			this.trigger("write", "remove", id, event_data);
		},

		_updated: function (row, data, event_data) {
			this.trigger("update", row, data, event_data);	
			this.trigger("write", "update", row, data, event_data);
		}, 

		insert_all: function (data, query) {
			var event_data = null;
			if (arguments.length > 2)
				event_data = arguments[2];
			if (query && this._query_model) {
				this.trigger("query_register", query);
				this._query_model.register(query);
			}
			var promise = Promise.and();
			for (var i = 0; i < data.length; ++i)
				promise = promise.and(this.insert(event_data ? [data[i], event_data] : data[i]));
			return promise.end();
		},

		_insert: function (data) {
			return Promise.create(null, new StoreException("unsupported: insert"));
		},

		_remove: function (id) {
			return Promise.create(null, new StoreException("unsupported: remove"));
		},

		_update: function (id, data) {
			return Promise.create(null, new StoreException("unsupported: update"));
		},

		insert: function (data) {
			var event_data = null;
			if (Types.is_array(data)) {
				event_data = data[1];
				data = data[0];
			}			
			if (this._create_ids && !(this._id_key in data && data[this._id_key]))
				data[this._id_key] = this._id_generator.generate();
			return this._insert(data).success(function (row) {
				this._inserted(row, event_data);
			}, this);
		},

		remove: function (id) {
			var event_data = null;
			if (Types.is_array(id)) {
				event_data = id[1];
				id = id[0];
			}			
			return this._remove(id).success(function () {
				this._removed(id, event_data);
			}, this);
		},

		update: function (id, data) {
			var event_data = null;
			if (Types.is_array(data)) {
				event_data = data[1];
				data = data[0];
			}			
			return this._update(id, data).success(function (row) {
				this._updated(row, data, event_data);
			}, this);
		}

	};
});


Scoped.define("module:Stores.WriteStore", [
                                           "base:Class",
                                           "base:Events.EventsMixin",
                                           "module:Stores.WriteStoreMixin"
                                           ], function (Class, EventsMixin, WriteStoreMixin, scoped) {
	return Class.extend({scoped: scoped}, [EventsMixin, WriteStoreMixin, function (inherited) {			
		return {

			constructor: function (options) {
				inherited.constructor.call(this);
				this._initializeWriteStore(options);
			},

			_ensure_index: function (key) {
			},

			ensure_index: function (key) {
				return this._ensure_index(key);
			}

		};
	}]);
});


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
				this.__key_encoding = options.key_encoding || {};
				this.__key_decoding = options.key_decoding || {};
				this.__value_encoding = options.value_encoding || {};
				this.__value_decoding = options.value_decoding || {};
				this.__projection = options.projection || {};
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


Scoped.define("module:Stores.PassthroughStore", [
                                                 "module:Stores.BaseStore",
                                                 "base:Objs"
                                                 ], function (BaseStore, Objs, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (store, options) {
				this.__store = store;
				options = options || {};
				options.id_key = store.id_key();
				this._projection = options.projection || {};
				inherited.constructor.call(this, options);
				if (options.destroy_store)
					this._auto_destroy(store);
			},

			_query_capabilities: function () {
				return this.__store._query_capabilities();
			},

			_insert: function (data) {
				return this.__store.insert(Objs.extend(data, this._projection));
			},

			_remove: function (id) {
				return this.__store.remove(id);
			},

			_get: function (id) {
				return this.__store.get(id);
			},

			_update: function (id, data) {
				return this.__store.update(id, data);
			},

			_query: function (query, options) {
				return this.__store.query(Objs.extend(query, this._projection), options);
			},

			_ensure_index: function (key) {
				return this.__store.ensure_index(key);
			},

			_store: function () {
				return this.__store;
			}

		};
	});
});




Scoped.define("module:Stores.WriteDelegatorStore", [
                                                    "module:Stores.BaseStore"
                                                    ], function (BaseStore, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (writeStore, options) {
				inherited.constructor.call(this, options);
				this.writeStore = writeStore;
			},

			destroy: function () {
				this.writeStore.off(null, null, this);
				inherited.destroy.call(this);
			},

			_insert: function (data) {
				return this.writeStore.insert(data);
			},

			_remove: function (id) {
				return this.writeStore.remove(id);
			},

			_update: function (id, data) {
				return this.writeStore.update(id, data);
			},

			_ensure_index: function (key) {
				return this.writeStore.ensure_index(key);
			}

		};
	});
});


Scoped.define("module:Stores.ReadDelegatorStore", [
                                                   "module:Stores.BaseStore"
                                                   ], function (BaseStore, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (readStore, options) {
				inherited.constructor.call(this, options);
				this.readStore = readStore;
			},

			_query_capabilities: function () {
				return this.readStore._query_capabilities();
			},

			_get: function (id) {
				return this.readStore.get(id);
			},

			_query: function (query, options) {
				return this.readStore.query(Objs.extend(query, this._projection), options);
			}

		};
	});
});


Scoped.define("module:Stores.AssocDumbStore", ["module:Stores.DumbStore"], function (DumbStore, scoped) {
	return DumbStore.extend({scoped: scoped}, {

		_read_key: function (key) {},
		_write_key: function (key, value) {},
		_remove_key: function (key) {},

		__read_id: function (key) {
			var raw = this._read_key(key);
			return raw ? parseInt(raw, 10) : null;
		},

		_read_last_id: function () {
			return this.__read_id("last_id");
		},

		_write_last_id: function (id) {
			this._write_key("last_id", id);
		},

		_remove_last_id: function () {
			this._remove_key("last_id");
		},

		_read_first_id: function () {
			return this.__read_id("first_id");
		},

		_write_first_id: function (id) {
			this._write_key("first_id", id);
		},

		_remove_first_id: function () {
			this._remove_key("first_id");
		},

		_read_item: function (id) {
			return this._read_key("item_" + id);
		},

		_write_item: function (id, data) {
			this._write_key("item_" + id, data);
		},

		_remove_item: function (id) {
			this._remove_key("item_" + id);
		},

		_read_next_id: function (id) {
			return this.__read_id("next_" + id);
		},

		_write_next_id: function (id, next_id) {
			this._write_key("next_" + id, next_id);
		},

		_remove_next_id: function (id) {
			this._remove_key("next_" + id);
		},

		_read_prev_id: function (id) {
			return this.__read_id("prev_" + id);
		},

		_write_prev_id: function (id, prev_id) {
			this._write_key("prev_" + id, prev_id);
		},

		_remove_prev_id: function (id) {
			this._remove_key("prev_" + id);
		}

	});
});

Scoped.define("module:Stores.DumbStore", [
                                          "module:Stores.BaseStore",
                                          "base:Promise",
                                          "base:Objs",
                                          "base:Iterators.Iterator"
                                          ], function (BaseStore, Promise, Objs, Iterator, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			_read_last_id: function () {},
			_write_last_id: function (id) {},
			_remove_last_id: function () {},
			_read_first_id: function () {},
			_write_first_id: function (id) {},
			_remove_first_id: function () {},
			_read_item: function (id) {},
			_write_item: function (id, data) {},
			_remove_item: function (id) {},
			_read_next_id: function (id) {},
			_write_next_id: function (id, next_id) {},
			_remove_next_id: function (id) {},
			_read_prev_id: function (id) {},
			_write_prev_id: function (id, prev_id) {},
			_remove_prev_id: function (id) {},

			constructor: function (options) {
				options = options || {};
				options.create_ids = true;
				inherited.constructor.call(this, options);
			},

			_insert: function (data) {
				return Promise.tryCatch(function () {
					var last_id = this._read_last_id();
					var id = data[this._id_key];
					if (last_id !== null) {
						this._write_next_id(last_id, id);
						this._write_prev_id(id, last_id);
					} else
						this._write_first_id(id);
					this._write_last_id(id);
					this._write_item(id, data);
					return data;
				}, this);
			},

			_remove: function (id) {
				return Promise.tryCatch(function () {
					var row = this._read_item(id);
					if (row) {
						this._remove_item(id);
						var next_id = this._read_next_id(id);
						var prev_id = this._read_prev_id(id);
						if (next_id !== null) {
							this._remove_next_id(id);
							if (prev_id !== null) {
								this._remove_prev_id(id);
								this._write_next_id(prev_id, next_id);
								this._write_prev_id(next_id, prev_id);
							} else {
								this._remove_prev_id(next_id);
								this._write_first_id(next_id);
							}
						} else if (prev_id !== null) {
							this._remove_next_id(prev_id);
							this._write_last_id(prev_id);
						} else {
							this._remove_first_id();
							this._remove_last_id();
						}
					}
					return row;
				}, this);
			},

			_get: function (id) {
				return Promise.tryCatch(function () {
					return this._read_item(id);
				}, this);
			},

			_update: function (id, data) {
				return Promise.tryCatch(function () {
					var row = this._get(id);
					if (row) {
						delete data[this._id_key];
						Objs.extend(row, data);
						this._write_item(id, row);
					}
					return row;
				}, this);
			},

			_query: function (query, options) {
				return Promise.tryCatch(function () {
					var iter = new Iterator();
					var store = this;
					var fid = this._read_first_id();
					Objs.extend(iter, {
						__id: fid === null ? 1 : fid,
								__store: store,
								__query: query,

								hasNext: function () {
									var last_id = this.__store._read_last_id();
									if (last_id === null)
										return false;
									while (this.__id < last_id && !this.__store._read_item(this.__id))
										this.__id++;
									return this.__id <= last_id;
								},

								next: function () {
									if (this.hasNext()) {
										var item = this.__store.get(this.__id);
										if (this.__id == this.__store._read_last_id())
											this.__id++;
										else
											this.__id = this.__store._read_next_id(this.__id);
										return item;
									}
									return null;
								}
					});
					return iter;
				}, this);
			}	

		};
	});
});

//Stores everything permanently in the browser's local storage

Scoped.define("module:Stores.LocalStore", [
                                           "module:Stores.AssocDumbStore",
                                           "json:"
                                           ], function (AssocDumbStore, JSON, scoped) {
	return AssocDumbStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (options, localStorage) {
				inherited.constructor.call(this, options);
				this.__prefix = options.prefix;
				this.__localStorage = localStorage;
			},

			__key: function (key) {
				return this.__prefix + key;
			},

			_read_key: function (key) {
				var prfkey = this.__key(key);
				return prfkey in this.__localStorage ? JSON.parse(this.__localStorage[prfkey]) : null;
			},

			_write_key: function (key, value) {
				this.__localStorage[this.__key(key)] = JSON.stringify(value);
			},

			_remove_key: function (key) {
				delete this.__localStorage[this.__key(key)];
			}

		};
	});
});

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
Scoped.define("module:Stores.SocketStore", [
                                            "module:Stores.BaseStore",
                                            "base:Objs"
                                            ], function (BaseStore, Objs, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (options, socket, prefix) {
				inherited.constructor.call(this, options);
				this.__socket = socket;
				this.__prefix = prefix;
				this._supportsAsync = false;
			},

			/** @suppress {missingProperties} */
			__send: function (action, data) {
				this.__socket.emit(this.__prefix + ":" + action, data);
			},

			_insert: function (data) {
				this.__send("insert", data);
			},

			_remove: function (id) {
				this.__send("remove", id);
			},

			_update: function (id, data) {
				this.__send("update", Objs.objectBy(id, data));
			}	

		};
	});
});



Scoped.define("module:Stores.AbstractIndex", [
                                              "base:Class",
                                              "base:Comparators",
                                              "base:Objs",
                                              "base:Functions"
                                              ], function (Class, Comparators, Objs, Functions, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (store, key, compare, options) {
				inherited.constructor.call(this);
				this._options = Objs.extend({
					exact: true,
					ignoreCase: false
				}, options);
				this._compare = compare || Comparators.byValue;
				this._store = store;
				this.__row_count = 0;
				this._initialize();
				var id_key = store.id_key();
				store.query({}).value().iterate(function (row) {
					this.__row_count++;
					this._insert(row[id_key], row[key]);
				}, this);
				store.on("insert", function (row) {
					this.__row_count++;
					this._insert(row[id_key], row[key]);
				}, this);
				store.on("remove", function (id) {
					this.__row_count--;
					this._remove(id);
				}, this);
				store.on("update", function (id, data) {
					if (key in data)
						this._update(id, data[key]);
				}, this);
			},

			_initialize: function () {},

			destroy: function () {
				this._store.off(null, null, this);
				inherited.destroy.call(this);
			},

			compare: function () {
				return this._compare.apply(arguments);
			},

			comparator: function () {
				return Functions.as_method(this, this._compare);
			},

			info: function () {
				return {
					row_count: this.__row_count,
					key_count: this._key_count(),
					key_count_ic: this._key_count_ic()
				};
			},

			options: function () {
				return this._options;
			},

			iterate: function (key, direction, callback, context) {
				this._iterate(key, direction, callback, context);
			},

			itemIterate: function (key, direction, callback, context) {
				this.iterate(key, direction, function (iterKey, id) {
					return callback.call(context, iterKey, this._store.get(id).value());
				}, this); 
			},

			iterate_ic: function (key, direction, callback, context) {
				this._iterate_ic(key, direction, callback, context);
			},

			itemIterateIc: function (key, direction, callback, context) {
				this.iterate_ic(key, direction, function (iterKey, id) {
					return callback.call(context, iterKey, this._store.get(id).value());
				}, this); 
			},

			_iterate: function (key, direction, callback, context) {},

			_iterate_ic: function (key, direction, callback, context) {},

			_insert: function (id, key) {},

			_remove: function (id) {},

			_update: function (id, key) {},

			_key_count: function () {},

			_key_count_ic: function () {},

			key_count_left_ic: function (key) {},
			key_count_right_ic: function (key) {},
			key_count_distance_ic: function (leftKey, rightKey) {},
			key_count_left: function (key) {},
			key_count_right: function (key) {},
			key_count_distance: function (leftKey, rightKey) {}

		};
	});
});

Scoped.define("module:Stores.MemoryIndex", [
                                            "module:Stores.AbstractIndex",
                                            "base:Structures.TreeMap",
                                            "base:Objs"
                                            ], function (AbstractIndex, TreeMap, Objs, scoped) {
	return AbstractIndex.extend({scoped: scoped}, function (inherited) {
		return {

			_initialize: function () {
				if (this._options.exact)
					this._exactMap = TreeMap.empty(this._compare);
				if (this._options.ignoreCase)
					this._ignoreCaseMap = TreeMap.empty(this._compare);
				this._idToKey = {};
			},

			__insert: function (id, key, map) {
				var value = TreeMap.find(key, map);
				if (value)
					value[id] = true;
				else 
					map = TreeMap.add(key, Objs.objectBy(id, true), map);
				return map;
			},

			_insert: function (id, key) {
				this._idToKey[id] = key;
				if (this._options.exact)
					this._exactMap = this.__insert(id, key, this._exactMap);
				if (this._options.ignoreCase)
					this._ignoreCaseMap = this.__insert(id, key, this._ignoreCaseMap);
			},

			__remove: function (key, map, id) {
				var value = TreeMap.find(key, map);
				delete value[id];
				if (Objs.is_empty(value))
					map = TreeMap.remove(key, map);
				return map;
			},

			_remove: function (id) {
				var key = this._idToKey[id];
				delete this._idToKey[id];
				if (this._options.exact)
					this._exactMap = this.__remove(key, this._exactMap, id);
				if (this._options.ignoreCase)
					this._ignoreCaseMap = this.__remove(key, this._ignoreCaseMap, id);
			},

			_update: function (id, key) {
				var old_key = this._idToKey[id];
				if (old_key == key)
					return;
				this._remove(id);
				this._insert(id, key);
			},

			_iterate: function (key, direction, callback, context) {
				TreeMap.iterate_from(key, this._exactMap, function (iterKey, value) {
					for (var id in value) {
						if (callback.call(context, iterKey, id) === false)
							return false;
					}
					return true;
				}, this, !direction);
			},	

			_iterate_ic: function (key, direction, callback, context) {
				TreeMap.iterate_from(key, this._ignoreCaseMap, function (iterKey, value) {
					for (var id in value) {
						if (callback.call(context, iterKey, id) === false)
							return false;
					}
					return true;
				}, this, !direction);
			},	

			_key_count: function () {
				return this._options.exact ? TreeMap.length(this._exactMap) : 0;
			},

			_key_count_ic: function () {
				return this._options.ignoreCase ? TreeMap.length(this._ignoreCaseMap) : 0;
			},

			key_count_left_ic: function (key) {
				return TreeMap.treeSizeLeft(key, this._ignoreCaseMap);
			},

			key_count_right_ic: function (key) {
				return TreeMap.treeSizeRight(key, this._ignoreCaseMap);
			},

			key_count_distance_ic: function (leftKey, rightKey) {
				return TreeMap.distance(leftKey, rightKey, this._ignoreCaseMap);
			},

			key_count_left: function (key) {
				return TreeMap.treeSizeLeft(key, this._exactMap);
			},

			key_count_right: function (key) {
				return TreeMap.treeSizeRight(key, this._exactMap);
			},

			key_count_distance: function (leftKey, rightKey) {
				return TreeMap.distance(leftKey, rightKey, this._exactMap);
			}

		};
	});
});


Scoped.define("module:Stores.CachedStore", [
                                            "module:Stores.DualStore",
                                            "module:Stores.MemoryStore",
                                            "module:Queries.DefaultQueryModel",
                                            "module:Queries.Constrained",
                                            "base:Objs",
                                            "base:Async"
                                            ], function (DualStore, MemoryStore, DefaultQueryModel, Constrained, Objs, Async, scoped) {
	return DualStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (parent, options) {
				options = options || {};
				var cache_store = options.cache_store;
				if (!("cache_store" in options)) {
					cache_store = this._auto_destroy(new MemoryStore({
						id_key: parent.id_key()
					}));
				}
				if (!cache_store.query_model())
					cache_store.query_model(options.cache_query_model ? options.cache_query_model : this._auto_destroy(new DefaultQueryModel()));
				this.__invalidation_options = options.invalidation || {};
				inherited.constructor.call(this,
						parent,
						cache_store,
						Objs.extend({
							get_options: {
								start: "second",
								strategy: "or"
							},
							query_options: {
								start: "second",
								strategy: "or",
								clone: true,
								or_on_null: false
							}
						}, options));
				if (this.__invalidation_options.reload_after_first_hit) {
					this.__queries = {};
					this.cache().on("query_hit", function (query, subsumizer) {
						var s = Constrained.serialize(subsumizer);
						if (!this.__queries[s]) {
							this.__queries[s] = true;
							Async.eventually(function () {
								this.invalidate_query(subsumizer, true);	                   
							}, [], this);
						}
					}, this);
					this.cache().on("query_miss", function (query) {
						var s = Constrained.serialize(query);
						this.__queries[s] = true;
					}, this);
				}
			},

			destroy: function () {
				this.cache().off(null, null, this);
				inherited.destroy.call(this);
			},

			invalidate_query: function (query, reload) {
				this.cache().query_model().invalidate(query);
				if (reload) 
					this.query(query.query, query.options);
				this.trigger("invalidate_query", query, reload);
			},

			cache: function () {
				return this.second();
			},

			store: function () {
				return this.first();
			}

		};
	});
});

Scoped.define("module:Stores.DualStore", [
                                          "module:Queries",
                                          "module:Queries.Constrained",
                                          "module:Stores.BaseStore",
                                          "base:Objs",
                                          "base:Iterators.ArrayIterator"
                                          ], function (Queries, Constrained, BaseStore, Objs, ArrayIterator, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (first, second, options) {
				options = Objs.extend({
					create_options: {},
					update_options: {},
					delete_options: {},
					get_options: {},
					query_options: {}
				}, options || {});
				options.id_key = first._id_key;
				this.__first = first;
				this.__second = second;
				inherited.constructor.call(this, options);
				this.__create_options = Objs.extend({
					start: "first", // "second"
					strategy: "then", // "or", "single"
					auto_replicate: "first" // "first", "second", "both", "none"
				}, options.create_options);
				this.__update_options = Objs.extend({
					start: "first", // "second"
					strategy: "then", // "or", "single"
					auto_replicate: "first" // "first", "second", "both", "none"
				}, options.update_options);
				this.__remove_options = Objs.extend({
					start: "first", // "second"
					strategy: "then", // "or", "single",
					auto_replicate: "first" // "first", "second", "both", "none"
				}, options.delete_options);
				this.__get_options = Objs.extend({
					start: "first", // "second"
					strategy: "or", // "single"
					clone: true, // false
					clone_second: false,
					or_on_null: true // false
				}, options.get_options);
				this.__query_options = Objs.extend({
					start: "first", // "second"
					strategy: "or", // "single"
					clone: true, // false
					clone_second: false,
					or_on_null: true // false
				}, options.query_options);
				this.__first.on("insert", this.__inserted_first, this);
				this.__second.on("insert", this.__inserted_second, this);
				this.__first.on("update", this.__updated_first, this);
				this.__second.on("update", this.__updated_second, this);
				this.__first.on("remove", this.__removed_first, this);
				this.__second.on("remove", this.__removed_second, this);
			},

			__inserted_first: function (row, event_data) {
				if (event_data && event_data.dual_insert)
					return;
				if (this.__create_options.auto_replicate == "first" || this.__create_options.auto_replicate == "both")
					this.__second.insert([row, {dual_insert: true}]);
				this._inserted(row);
			},

			__inserted_second: function (row, event_data) {
				if (event_data && event_data.dual_insert)
					return;
				if (this.__create_options.auto_replicate == "second" || this.__create_options.auto_replicate == "both")
					this.__first.insert([row, {dual_insert: true}]);
				this._inserted(row);
			},

			__updated_first: function (row, update, event_data) {
				if (event_data && event_data.dual_update)
					return;
				if (this.__update_options.auto_replicate == "first" || this.__update_options.auto_replicate == "both")
					this.__second.update(row[this.id_key()], [update, {dual_update: true}]);
				this._updated(row, update);
			},

			__updated_second: function (row, update, event_data) {
				if (event_data && event_data.dual_update)
					return;
				if (this.__update_options.auto_replicate == "second" || this.__update_options.auto_replicate == "both")
					this.__first.update(row[this.id_key()], [update, {dual_update: true}]);
				this._updated(row, update);
			},

			__removed_first: function (id, event_data) {
				if (event_data && event_data.dual_remove)
					return;
				if (this.__remove_options.auto_replicate == "first" || this.__remove_options.auto_replicate == "both")
					this.__second.remove([id, {dual_remove: true}]);
				this._removed(id);
			},

			__removed_second: function (id, event_data) {
				if (event_data && event_data.dual_remove)
					return;
				if (this.__remove_options.auto_replicate == "second" || this.__remove_options.auto_replicate == "both")
					this.__first.remove([id, {dual_remove: true}]);
				this._removed(id);
			},

			first: function () {
				return this.__first;
			},

			second: function () {
				return this.__second;
			},

			_insert: function (data) {
				var first = this.__first;
				var second = this.__second;
				if (this.__create_options.start != "first") {
					first = this.__second;
					second = this.__first;
				}
				var strategy = this.__create_options.strategy;
				if (strategy == "then")
					return first.insert([data, {dual_insert: true}]).mapSuccess(function (row) {
						return second.insert([row, {dual_insert: true}]);
					}, this);
				else if (strategy == "or")
					return first.insert([data, {dual_insert: true}]).mapError(function () {
						return second.insert([data, {dual_insert: true}]);
					}, this);
				else
					return first.insert([data, {dual_insert: true}]);
			},

			_update: function (id, data) {
				var first = this.__first;
				var second = this.__second;
				if (this.__update_options.start != "first") {
					first = this.__second;
					second = this.__first;
				}
				var strategy = this.__update_options.strategy;
				if (strategy == "then")
					return first.update(id, [data, {dual_update: true}]).mapSuccess(function (row) {
						return second.update(id, [row, {dual_update: true}]);
					}, this);
				else if (strategy == "or")
					return first.update(id, [data, {dual_update: true}]).mapError(function () {
						return second.update(id, [data, {dual_update: true}]);
					}, this);
				else
					return first.update(id, [data, {dual_update: true}]);
			},

			_remove: function (id) {
				var first = this.__first;
				var second = this.__second;
				if (this.__remove_options.start != "first") {
					first = this.__second;
					second = this.__first;
				}
				var strategy = this.__remove_options.strategy;
				if (strategy == "then")
					return first.remove([id, {dual_remove: true}]).mapSuccess(function () {
						return second.remove([id, {dual_remove: true}]);
					}, this);
				else if (strategy == "or")
					return first.remove([id, {dual_remove: true}]).mapError(function () {
						return second.remove([id, {dual_remove: true}]);
					}, this);
				else
					return first.remove(id);
			},

			_query_capabilities: function () {
				return Constrained.fullConstrainedQueryCapabilities(Queries.fullQueryCapabilities()); 
			},

			_get: function (id) {
				var first = this.__first;
				var second = this.__second;
				if (this.__get_options.start != "first") {
					first = this.__second;
					second = this.__first;
				}
				var strategy = this.__get_options.strategy;
				var clone = this.__get_options.clone;
				var clone_second = this.__get_options.clone_second;
				var or_on_null = this.__get_options.or_on_null;
				var result = null;
				if (strategy == "or") {
					return first.get(id).mapCallback(function (error, result) {
						if (error || (!result && or_on_null))
							return second.get(id).mapSuccess(function (result) {
								return result && clone ? first.insert(result) : result;
							}, this);
						if (!clone_second)
							return result;
						return second.get(id).mapCallback(function (error, row) {
							if (error || !row)
								return second.insert(result);
							return result;
						}, this);
					}, this);
				} else
					return first.get(id);
			},

			_query: function (query, options) {
				var first = this.__first;
				var second = this.__second;
				if (this.__query_options.start != "first") {
					first = this.__second;
					second = this.__first;
				}
				var strategy = this.__query_options.strategy;
				var clone = this.__query_options.clone;
				var clone_second = this.__get_options.clone_second;
				var or_on_null = this.__query_options.or_on_null;
				var result = null;
				if (strategy == "or") {
					this.trigger("query_first", query, options);
					return first.query(query, options).mapCallback(function (error, result) {
						if (error || (!result && or_on_null)) {
							this.trigger("query_second", query, options);
							return second.query(query, options).mapSuccess(function (result) {
								if (result && clone) {
									var arr = result.asArray();
									return first.insert_all(arr, {query: query, options: options}, {dual_insert: true}).mapSuccess(function () {
										return new ArrayIterator(arr);
									});
								}
								return result;
							}, this);
						}
						if (!clone_second)
							return result;
						this.trigger("query_second", query, options);
						return second.query(query, options).mapCallback(function (error, result2) {
							if (error || !result2) {
								var arr = result.asArray();
								return second.insert_all(arr, {query: query, options: options}, {dual_insert: true}).mapSuccess(function () {
									return new ArrayIterator(arr);
								});
							}
							return result;
						}, this);
					}, this);
				} else {
					this.trigger("query_first", query, options);
					return first.query(query, options);
				}
			}

		};
	});
});

Scoped.define("module:Queries.AbstractQueryModel", [
                                                    "base:Class"
                                                    ], function (Class, scoped) {
	return Class.extend({scoped: scoped}, {

		register: function (query) {},

		executable: function (query) {}

	});
});


Scoped.define("module:Queries.DefaultQueryModel", [
                                                   "module:Queries.AbstractQueryModel",
                                                   "module:Queries.Constrained",
                                                   "base:Objs"
                                                   ], function (AbstractQueryModel, Constrained, Objs, scoped) {
	return AbstractQueryModel.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function () {
				inherited.constructor.call(this);
				this.__queries = {};    
			},

			_insert: function (query) {
				this.__queries[Constrained.serialize(query)] = query;
			},

			_remove: function (query) {
				delete this.__queries[Constrained.serialize(query)];
			},

			exists: function (query) {
				return Constrained.serialize(query) in this.__queries;
			},

			subsumizer_of: function (query) {
				if (this.exists(query))
					return query;
				var result = null;
				Objs.iter(this.__queries, function (query2) {
					if (Constrained.subsumizes(query2, query))
						result = query2;
					return !result;
				}, this);
				return result;
			},

			executable: function (query) {
				return !!this.subsumizer_of(query);
			},

			register: function (query) {
				var changed = true;
				var check = function (query2) {
					if (Constrained.subsumizes(query, query2)) {
						this._remove(query2);
						changed = true;
					}/* else if (Constrained.mergeable(query, query2)) {
						this._remove(query2);
						changed = true;
						query = Constrained.merge(query, query2);
					} */
				};
				while (changed) {
					changed = false;
					Objs.iter(this.__queries, check, this);
				}
				this._insert(query);
			},

			invalidate: function (query) {
				var subsumizer = this.subsumizer_of(query);
				if (subsumizer)
					this._remove(subsumizer);
			}

		};
	});
});


Scoped.define("module:Queries.StoreQueryModel", [
                                                 "module:Queries.DefaultQueryModel",
                                                 "module:Queries.Constrained"
                                                 ], function (DefaultQueryModel, Constrained, scoped) {
	return DefaultQueryModel.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (store) {
				this.__store = store;
				inherited.constructor.call(this);
			},

			initialize: function () {
				return this.__store.mapSuccess(function (result) {
					while (result.hasNext()) {
						var query = result.next();
						delete query.id;
						this._insert(query);
					}
				}, this);
			},

			_insert: function (query) {
				inherited._insert.call(this, query);
				this.__store.insert(query);
			},

			_remove: function (query) {
				delete this.__queries[Constrained.serialize(query)];
				this.__store.query({query: query}).success(function (result) {
					while (result.hasNext())
						this.__store.remove(result.next().id);
				}, this);
			}

		};
	});
});

Scoped.define("module:Collections.QueryCollection", [      
                                                     "base:Collections.Collection",
                                                     "base:Objs",
                                                     "base:Types",
                                                     "base:Comparators",
                                                     "base:Promise",
                                                     "base:Class",
                                                     "module:Queries.Constrained",
                                                     "module:Queries"
                                                     ], function (Collection, Objs, Types, Comparators, Promise, Class, Constrained, Queries, scoped) {
	return Collection.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (source, query, options) {
				inherited.constructor.call(this);
				options = options || {};
				this._id_key = this._id_key || options.id_key || "id";
				this._source = source;
				this._complete = false;
				this._active = options.active || false;
				this._incremental = "incremental" in options ? options.incremental : true; 
				this._active_bounds = "active_bounds" in options ? options.active_bounds : true;
				this._enabled = false;
				this._range = options.range || null;
				this._forward_steps = options.forward_steps || null;
				this._backward_steps = options.backward_steps || null;
				this._query = {
					query: {},
					options: {
						skip: 0,
						limit: null,
						sort: null
					}
				};
				this._watched = null;
				query = query || {};
				this.update(query.query ? query : {
					query: query,
					options: {
						skip: options.skip || 0,
						limit: options.limit || options.range || null,
						sort: options.sort || null
					}
				});
				if (options.auto)
					this.enable();
			},

			destroy: function () {
				this.disable();
				inherited.destroy.call(this);
			},

			
			
			paginate: function (index) {
				return this.update({options: {
					skip: index * this._range,
					limit: this._range
				}});
			},
			
			paginate_index: function () {
				return Math.floor(this.getSkip() / this._range);
			},
			
			paginate_next: function () {
				return this.isComplete() ? Promise.create(true) : this.paginate(this.paginate_index() + 1);
			},
			
			paginate_prev: function () {
				return this.paginate_index() > 0 ? this.paginate(this.paginate_index() - 1) : Promise.create(true);
			},		
			
			increase_forwards: function (steps) {
				steps = steps || this._forward_steps;
				return this.isComplete() ? Promise.create(true) : this.update({options: {
					limit: this.getLimit() + steps
				}});
			},

			increase_backwards: function (steps) {
				steps = steps || this._backward_steps;
				return !this.getSkip() ? Promise.create(true) : this.update({options: {
					skip: Math.max(this.getSkip() - steps, 0),
					limit: this.getLimit() ? this.getLimit() + this.getSkip() - Math.max(this.getSkip() - steps, 0) : null  
				}});
			},
			

			get_ident: function (obj) {
				return Class.is_class_instance(obj) ? obj.get(this._id_key) : obj[this._id_key];
			},

			getQuery: function () {
				return this._query;
			},

			getSkip: function () {
				return this._query.options.skip || 0;
			},

			getLimit: function () {
				return this._query.options.limit || null;
			},

			update: function (constrainedQuery) {
				constrainedQuery = Constrained.rectify(constrainedQuery);
				var currentSkip = this._query.options.skip || 0;
				var currentLimit = this._query.options.limit || null;
				if (constrainedQuery.query)
					this._query.query = constrainedQuery.query;
				this._query.options = Objs.extend(this._query.options, constrainedQuery.options);
				if (!this._enabled)
					return Promise.create(true);
				if (constrainedQuery.query || "sort" in constrainedQuery.options || !this._incremental)					
					return this.refresh();
				var nextSkip = "skip" in constrainedQuery.options ? constrainedQuery.options.skip || 0 : currentSkip;
				var nextLimit = "limit" in constrainedQuery.options ? constrainedQuery.options.limit || null : currentLimit;
				if (nextSkip === currentSkip && nextLimit === currentLimit)
					return Promise.create(true);
				// No overlap
				if ((nextLimit && nextSkip + nextLimit <= currentSkip) || (currentLimit && currentSkip + currentLimit <= nextSkip))
					return this.refresh();
				// Make sure that currentSkip >= nextSkip
				while (currentSkip < nextSkip && (currentLimit === null || currentLimit > 0)) {
					this.remove(this.getByIndex(0));
					currentSkip++;
					currentLimit--;
				}
				var promise = Promise.create(true);
				// Make sure that nextSkip === currentSkip
				if (nextSkip < currentSkip) {
					var leftLimit = currentSkip - nextSkip;
					if (nextLimit !== null)
						leftLimit = Math.min(leftLimit, nextLimit);
					promise = this._execute(Objs.tree_extend({options: {
						skip: nextSkip,
						limit: leftLimit    
					}}, this._query, 2));
					nextSkip += leftLimit;
					if (nextLimit !== null)
						nextLimit -= leftLimit;
				}
				if (!currentLimit || (nextLimit && nextLimit <= currentLimit)) {
					if (nextLimit)
						while (this.count() > nextLimit)
							this.remove(this.getByIndex(this.count() - 1));
					return promise;
				}
				return promise.and(this._execute(Objs.tree_extend({
					options: {
						skip: currentSkip + currentLimit,
						limit: !nextLimit ? null : nextLimit - currentLimit
					}
				}, this._query, 2)));
			},

			enable: function () {
				if (this._enabled)
					return;
				this._enabled = true;
				this.refresh();
			},

			disable: function () {
				if (!this._enabled)
					return;
				this._enabled = false;
				this.clear();
				if (this._watched) {
					this._unwatchQuery(this._watched);
					this._watched = null;
				}
			},

			refresh: function (clear) {
				if (clear)
					this.clear();
				if (this._query.options.sort && !Types.is_empty(this._query.options.sort))
					this.set_compare(Comparators.byObject(this._query.options.sort));
				else
					this.set_compare(null);
				if (this._watched) {
					this._unwatchQuery(this._watched);
					this._watched = null;
				}
				if (this._active) {
					this._watched = this._query.query;
					this._watchQuery(this._watched);
				}
				return this._execute(this._query);
			},

			isEnabled: function () {
				return this._enabled;
			},

			_execute: function (constrainedQuery) {
				var limit = constrainedQuery.options.limit;
				return this._subExecute(constrainedQuery.query, constrainedQuery.options).mapSuccess(function (iter) {
					var result = iter.asArray();
					this._complete = limit === null || result.length < limit;
					this.replace_objects(result);
					return true;
				}, this);
			},

			_subExecute: function (query, options) {
				return this._source.query(query, options);
			},

			isComplete: function () {
				return this._complete;
			},

			_watchQuery: function (query) {},

			_unwatchQuery: function () {},

			isValid: function (data) {
				return Queries.evaluate(this._query.query, data);
			},

			_materialize: function (data) {
				return data;
			},

			_activeCreate: function (data) {
				if (!this._active || !this._enabled)
					return;
				if (!this.isValid(data))
					return;
				this.add(this._materialize(data));
				if (this._query.options.limit && this.count() > this._query.options.limit) {
					if (this._active_bounds)
						this._query.options.limit++;
					else
						this.remove(this.getByIndex(this.count() - 1));
				}
			},

			_activeRemove: function (id) {
				if (!this._active || !this._enabled)
					return;
				var object = this.getById(id);
				if (!object)
					return;
				this.remove(object);
				if (this._query.options.limit !== null) {
					if (this._active_bounds)
						this._query.options.limit--;
				}
			},

			_activeUpdate: function (id, data, row) {
				if (!this._active || !this._enabled)
					return;
				var object = this.getById(id);
				var merged = Objs.extend(row, data);
				if (!object)
					this._activeCreate(merged);
				else if (!this.isValid(merged))
					this._activeRemove(id);
				else
					object.setAll(data);
			}


		};
	});
});




Scoped.define("module:Collections.StoreQueryCollection", [      
                                                          "module:Collections.QueryCollection",
                                                          "base:Objs"
                                                          ], function (QueryCollection, Objs, scoped) {
	return QueryCollection.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (source, query, options) {
				inherited.constructor.call(this, source, query, Objs.extend({
					id_key: source.id_key()
				}, options));
				source.on("insert", this._activeCreate, this);
				source.on("remove", this._activeRemove, this);
				source.on("update", function (row, data) {
					this._activeUpdate(source.id_of(row), data, row);
				}, this);
			},

			destroy: function () {
				this._source.off(null, null, this);
				inherited.destroy.call(this);
			},

			get_ident: function (obj) {
				return obj.get(this._source.id_key());
			}

		};
	});
});

Scoped.define("module:Collections.TableQueryCollection", [      
                                                          "module:Collections.QueryCollection",
                                                          "base:Objs"
                                                          ], function (QueryCollection, Objs, scoped) {
	return QueryCollection.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (source, query, options) {
				inherited.constructor.call(this, source, query, Objs.extend({
					id_key: source.primary_key()
				}, options));
				source.on("create", this._activeCreate, this);
				source.on("remove", this._activeRemove, this);
				source.on("update", this._activeUpdate, this);
			},

			destroy: function () {
				this._source.off(null, null, this);
				inherited.destroy.call(this);
			},

			_materialize: function (data) {
				return this._source.materialize(data);
			}

		};
	});
});



Scoped.define("module:Modelling.ModelException", [
                                                  "base:Exceptions.Exception"
                                                  ], function (Exception, scoped) {
	return Exception.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (model, message) {
				inherited.constructor.call(this, message);
				this.__model = model;
			},

			model: function () {
				return this.__model;
			}

		};
	});
});


Scoped.define("module:Modelling.ModelMissingIdException", [
                                                           "module:Modelling.ModelException"
                                                           ], function (Exception, scoped) {
	return Exception.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (model) {
				inherited.constructor.call(this, model, "No id given.");
			}

		};
	});
});


Scoped.define("module:Modelling.ModelInvalidException", [
                                                         "module:Modelling.ModelException",
                                                         "base:Objs"
                                                         ], function (Exception, Objs, scoped) {
	return Exception.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (model) {
				var message = Objs.values(model.errors()).join("\n");
				inherited.constructor.call(this, model, message);
			}

		};
	});
});

Scoped.define("module:Modelling.Model", [
                                         "module:Modelling.AssociatedProperties",
                                         "module:Modelling.ModelInvalidException",
                                         "base:Objs",
                                         "base:Promise",
                                         "base:Types",
                                         "base:Exceptions"
                                         ], function (AssociatedProperties, ModelInvalidException, Objs, Promise, Types, Exceptions, scoped) {
	return AssociatedProperties.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (attributes, table, options) {
				this.__table = table;
				this.__options = Objs.extend({
					newModel: true,
					removed: false
				}, options);
				this.__silent = 1;
				inherited.constructor.call(this, attributes);
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
				inherited.destroy.call(this);
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
				return this.isNew() ? Promise.create(true) : this.save();
			},

			_afterSet: function (key, value, old_value, options) {
				inherited._afterSet.call(this, key, value, old_value, options);
				var scheme = this.cls.scheme();
				if (!(key in scheme) || this.__silent > 0)
					return;
				if (this.option("auto_update") && !this.isNew())
					this.save();
			},

			save: function () {
				if (this.isRemoved())
					return Promise.create({});
				var promise = this.option("save_invalid") ? Promise.value(true) : this.validate();
				return promise.mapSuccess(function (valid) {
					if (!valid)
						return Promise.create(null, new ModelInvalidException(this));
					var attrs;
					if (this.isNew()) {
						attrs = this.cls.filterPersistent(this.get_all_properties());
						if (this.__options.type_column)
							attrs[this.__options.type_column] = this.cls.classname;
					} else {
						attrs = this.cls.filterPersistent(this.properties_changed());
						if (Types.is_empty(attrs))
							return Promise.create(attrs);
					}
					var wasNew = this.isNew();
					var promise = this.isNew() ? this.__table.store().insert(attrs) : this.__table.store().update(this.id(), attrs);
					return promise.mapCallback(function (err, result) {
						if (err)
							return Exceptions.ensure(this.validation_exception_conversion(err));
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
				}, this);
			},

			remove: function () {
				if (this.isNew() || this.isRemoved())
					return Promise.create(true);
				return this.__table.store().remove(this.id()).mapSuccess(function (result) {
					this.trigger("remove");		
					this.__options.removed = true;
					return result;
				}, this);
			}	

		};
	});
});
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
				var validate = entry.validate;
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
				var asInner = function (key) {
					var target = scheme[key].tags || [];
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
				};
				for (var key in props)
					if (key in scheme)
						asInner.call(this, key);
				return rec;		
			},

			setByTags: function (data, tags) {
				var scheme = this.cls.scheme();
				tags = tags || {};
				var setInner = function (key) {
					var target = scheme[key].tags || [];
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
				};
				for (var key in data)
					if (key in scheme)
						setInner.call(this, key);
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
					return obj.execute.apply(obj, arguments);
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
				if ("activeQuery" in this.__store) {
					this.activeQuery = function (constrainedQuery, ctx) {
						return this.__store.activeQuery(constrainedQuery, ctx || this);
					};
				}
				if ("unregisterQuery" in this.__store) {
					this.unregisterQuery = function (constrainedQuery, ctx) {
						return this.__store.unregisterQuery(constrainedQuery, ctx || this);
					};
				}
			},

			modelClass: function (cls) {
				cls = cls || this.__model_type;
				return Types.is_string(cls) ? Scoped.getGlobal(cls) : cls;
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
					return new MappedIterator(iterator, function (obj) {
						return this.materialize(obj);
					}, this);
				}, this);
			},

			primary_key: function () {
				return (Types.is_string(this.__model_type) ? Scoped.getGlobal(this.__model_type) : this.__model_type).primary_key();
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
			}

		};
	}]);
});
Scoped.define("module:Modelling.Associations.Association", [
                                                            "base:Class",
                                                            "base:Promise",
                                                            "base:Iterators"
                                                            ], function (Class, Promise, Iterators, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (model, options) {
				inherited.constructor.call(this);
				this._model = model;
				this._options = options || {};
				if (options.delete_cascade) {
					model.on("remove", function () {
						this.__delete_cascade();
					}, this);
				}
			},

			__delete_cascade: function () {
				this.execute().success(function (iter) {
					iter = Iterators.ensure(iter);
					while (iter.hasNext())
						iter.next().remove({});
				}, this);
			},

			execute: function () {
				if ("__cache" in this)
					return Promise.create(this.__cache);
				var promise = this._execute();
				if (this._options.cached) {
					promise.callback(function (error, value) {
						this.__cache = error ? null : value;
					}, this);
				}
				return promise;
			},

			invalidate: function () {
				delete this.__cache;
			}

		};
	});
});
Scoped.define("module:Modelling.Associations.BelongsToAssociation", [
        "module:Modelling.Associations.TableAssociation",
        "base:Promise",
        "base:Objs"
    ], function (TableAssociation, Promise, Objs, scoped) {
    return TableAssociation.extend({scoped: scoped}, function (inherited) {
		return {
			
			_execute: function () {
				var value = this._model.get(this._foreign_key);
				if (!value)
					return Promise.value(null);
				return this._primary_key ?
					this._foreign_table.findBy(Objs.objectBy(this._primary_key, value)) :
					this._foreign_table.findById(value);
			}
	
		};
    });
});
Scoped.define("module:Modelling.Associations.ConditionalAssociation", [
                                                                       "module:Modelling.Associations.Associations",
                                                                       "base:Objs"
                                                                       ], function (Associations, Objs, scoped) {
	return Associations.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (model, options) {
				inherited.constructor.call(this, model, Objs.extend({
					conditional: function () { return true; }
				}, options));
			},

			_execute: function () {
				var assoc = this.assoc();
				return assoc.execute.apply(assoc, arguments);
			},

			assoc: function () {
				return this._model.assocs[this._options.conditional(this._model)];
			}

		};
	});
});
Scoped.define("module:Modelling.Associations.HasManyAssociation", [
        "module:Modelling.Associations.TableAssociation",
        "base:Objs",
        "base:Iterators.ArrayIterator"
    ], function (TableAssociation, Objs, ArrayIterator, scoped) {
    return TableAssociation.extend({scoped: scoped}, function (inherited) {
		return {
		
			_id: function () {
				return this._primary_key ? this._model.get(this._primary_key) : this._model.id();
			},
		
			_execute: function () {
				return this.allBy();
			},
		
			execute: function () {
				return inherited.execute.call(this).mapSuccess(function (items) {
					return new ArrayIterator(items);
				});
			},
			
			findBy: function (query) {
				return this._foreign_table.findBy(Objs.objectBy(this._foreign_key, this._id()));
			},
		
			allBy: function (query, id) {
				return this._foreign_table.allBy(Objs.extend(Objs.objectBy(this._foreign_key, id ? id : this._id(), query)));
			}

		};
    });
});
Scoped.define("module:Modelling.Associations.HasManyThroughArrayAssociation", [
        "module:Modelling.Associations.HasManyAssociation",
        "base:Promise",
        "base:Objs"
    ], function (HasManyAssociation, Promise, Objs, scoped) {
    return HasManyAssociation.extend({scoped: scoped}, {
		
		_execute: function () {
			var returnPromise = Promise.create();
			var promises = Promise.and();
			Objs.iter(this._model.get(this._foreign_key), function (id) {
				promises = promises.and(this._foreign_table.findById(id));
			}, this);
			promises.forwardError(returnPromise).success(function (result) {
				returnPromise.asyncSuccess(Objs.filter(result, function (item) {
					return !!item;
				}));
			});
			return returnPromise;
		}

    });
});
Scoped.define("module:Modelling.Associations.HasManyViaAssociation", [
        "module:Modelling.Associations.HasManyAssociation",
        "base:Objs",
        "base:Promise"
    ], function (HasManyAssociation, Objs, Promise, scoped) {
    return HasManyAssociation.extend({scoped: scoped}, function (inherited) {
		return {
			
			constructor: function (model, intermediate_table, intermediate_key, foreign_table, foreign_key, options) {
				inherited.constructor.call(this, model, foreign_table, foreign_key, options);
				this._intermediate_table = intermediate_table;
				this._intermediate_key = intermediate_key;
			},
		
			findBy: function (query) {
				var returnPromise = Promise.create();
				var intermediateQuery = Objs.objectBy(this._intermediate_key, this._id());
				this._intermediate_table.findBy(intermediateQuery).forwardError(returnPromise).success(function (intermediate) {
					if (intermediate) {
						var full_query = Objs.extend(
							Objs.clone(query, 1),
							Objs.objectBy(this._foreign_table.primary_key(), intermediate.get(this._foreign_key)));
						this._foreign_table.findBy(full_query).forwardCallback(returnPromise);
					} else
						returnPromise.asyncSuccess(null);
				}, this);
				return returnPromise;
			},
		
			allBy: function (query, id) {
				var returnPromise = Promise.create();
				var intermediateQuery = Objs.objectBy(this._intermediate_key, id ? id : this._id());
				this._intermediate_table.allBy(intermediateQuery).forwardError(returnPromise).success(function (intermediates) {
					var promises = Promise.and();
					while (intermediates.hasNext()) {
						var intermediate = intermediates.next();
						var full_query = Objs.extend(
							Objs.clone(query, 1),
							Objs.objectBy(this._foreign_table.primary_key(), intermediate.get(this._foreign_key)));
						promises = promises.and(this._foreign_table.allBy(full_query));
					}
					promises.forwardError(returnPromise).success(function (foreignss) {
						var results = [];
						Objs.iter(foreignss, function (foreigns) {
							while (foreigns.hasNext())
								results.push(foreigns.next());
						});
						returnPromise.asyncSuccess(results);
					}, this);
				}, this);
				return returnPromise;
			}

		};
    });
});
Scoped.define("module:Modelling.Associations.HasOneAssociation", [
        "module:Modelling.Associations.TableAssociation",
        "base:Objs"
    ], function (TableAssociation, Objs, scoped) {
    return TableAssociation.extend({scoped: scoped}, {
	
		_execute: function (id) {
			var value = id ? id : (this._primary_key ? this._model.get(this._primary_key) : this._model.id());
			return this._foreign_table.findBy(Objs.objectBy(this._foreign_key, value));
		}

    });
});
Scoped.define("module:Modelling.Associations.PolymorphicHasOneAssociation", [
        "module:Modelling.Associations.Association",
        "base:Objs"
    ], function (Association, Objs, scoped) {
    return Association.extend({scoped: scoped}, function (inherited) {
		return {
			
			constructor: function (model, foreign_table_key, foreign_key, options) {
				inherited.constructor.call(this, model, options);
				this._foreign_table_key = foreign_table_key;
				this._foreign_key = foreign_key;
				if (options.primary_key)
					this._primary_key = options.primary_key;
			},

			_execute: function (id) {
				var value = id ? id : (this._primary_key ? this._model.get(this._primary_key) : this._model.id());
				var foreign_table = Scoped.getGlobal(this._model.get(this._foreign_table_key));
				return foreign_table.findBy(Objs.objectBy(this._foreign_key, value));
			}

		};
    });
});

Scoped.define("module:Modelling.Associations.TableAssociation", [
        "module:Modelling.Associations.Association"
    ], function (Association, scoped) {
    return Association.extend({scoped: scoped}, function (inherited) {
		return {
			
			constructor: function (model, foreign_table, foreign_key, options) {
				inherited.constructor.call(this, model, options);
				this._foreign_table = foreign_table;
				this._foreign_key = foreign_key;
			}

		};
    });
});
Scoped.define("module:Modelling.Validators.ConditionalValidator", [
        "module:Modelling.Validators.Validator",
        "base:Types"
    ], function (Validator, Types, scoped) {
    return Validator.extend({scoped: scoped}, function (inherited) {
		return {
			
			constructor: function (condition, validator) {
				inherited.constructor.call(this);
				this.__condition = condition;
				this.__validator = Types.is_array(validator) ? validator : [validator];
			},
		
			validate: function (value, context) {
				if (!this.__condition(value, context))
					return null;
				for (var i = 0; i < this.__validator.length; ++i) {
					var result = this.__validator[i].validate(value, context);
					if (result !== null)
						return result;
				}
				return null;
			}

		};
    });
});
Scoped.define("module:Modelling.Validators.EmailValidator", [
        "module:Modelling.Validators.Validator",
        "base:Strings"
    ], function (Validator, Strings, scoped) {
    return Validator.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (error_string) {
				inherited.constructor.call(this);
				this.__error_string = error_string ? error_string : "Not a valid email address";
			},
		
			validate: function (value, context) {
				return Strings.is_email_address(value) ? null : this.__error_string;
			}

		};
    });
});
Scoped.define("module:Modelling.Validators.LengthValidator", [
        "module:Modelling.Validators.Validator",
        "base:Types",
        "base:Objs"
    ], function (Validator, Types, Objs, scoped) {
    return Validator.extend({scoped: scoped}, function (inherited) {
		return {
			
			constructor: function (options) {
				inherited.constructor.call(this);
				options = Objs.extend({
					min_length: null,
					max_length: null,
					error_string: null
				}, options);
				this.__min_length = options.min_length;
				this.__max_length = options.max_length;
				this.__error_string = options.error_string;
				if (!this.__error_string) {
					if (this.__min_length !== null) {
						if (this.__max_length !== null)
							this.__error_string = "Between " + this.__min_length + " and " + this.__max_length + " characters";
						else
							this.__error_string = "At least " + this.__min_length + " characters";
					} else if (this.__max_length !== null)
						this.__error_string = "At most " + this.__max_length + " characters";
				}
			},
		
			validate: function (value, context) {
				if (this.__min_length !== null && (!value || value.length < this.__min_length))
					return this.__error_string;
				if (this.__max_length !== null && value.length > this.__max_length)
					return this.__error_string;
				return null;
			}

		};
    });
});
Scoped.define("module:Modelling.Validators.PresentValidator", [
        "module:Modelling.Validators.Validator",
        "base:Types"
    ], function (Validator, Types, scoped) {
    return Validator.extend({scoped: scoped}, function (inherited) {
		return {
			
			constructor: function (error_string) {
				inherited.constructor.call(this);
				this.__error_string = error_string ? error_string : "Field is required";
			},
		
			validate: function (value, context) {
				return Types.is_null(value) || value === "" ? this.__error_string : null;
			}

		};
    });
});
Scoped.define("module:Modelling.Validators.UniqueValidator", [
        "module:Modelling.Validators.Validator"
    ], function (Validator, scoped) {
    return Validator.extend({scoped: scoped}, function (inherited) {
		return {
			
			constructor: function (key, error_string) {
				inherited.constructor.call(this);
				this.__key = key;
				this.__error_string = error_string ? error_string : "Key already present";
			},
		
			validate: function (value, context) {
				var query = {};
				query[this.__key] = value;
				return context.table().findBy(query).mapSuccess(function (item) {
					return (!item || (!context.isNew() && context.id() == item.id())) ? null : this.__error_string;
				}, this);		
			}

		};
    });
});
Scoped.define("module:Modelling.Validators.Validator", [
        "base:Class"
    ], function (Class, scoped) {
    return Class.extend({scoped: scoped}, {
		
		validate: function (value, context) {
			return null;
		}

    });
});
}).call(Scoped);