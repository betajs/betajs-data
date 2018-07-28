/*!
betajs-data - v1.0.111 - 2018-07-28
Copyright (c) Oliver Friedmann
Apache-2.0 Software License.
*/
/** @flow **//*!
betajs-scoped - v0.0.19 - 2018-04-07
Copyright (c) Oliver Friedmann
Apache-2.0 Software License.
*/
var Scoped = (function () {
var Globals = (function () {  
/** 
 * This helper module provides functions for reading and writing globally accessible namespaces, both in the browser and in NodeJS.
 * 
 * @module Globals
 * @access private
 */
return {
		
	/**
	 * Returns the value of a global variable.
	 * 
	 * @param {string} key identifier of a global variable
	 * @return value of global variable or undefined if not existing
	 */
	get : function(key/* : string */) {
		if (typeof window !== "undefined")
			return key ? window[key] : window;
		if (typeof global !== "undefined")
			return key ? global[key] : global;
		if (typeof self !== "undefined")
			return key ? self[key] : self;
		return undefined;
	},

	
	/**
	 * Sets a global variable.
	 * 
	 * @param {string} key identifier of a global variable
	 * @param value value to be set
	 * @return value that has been set
	 */
	set : function(key/* : string */, value) {
		if (typeof window !== "undefined")
			window[key] = value;
		if (typeof global !== "undefined")
			global[key] = value;
		if (typeof self !== "undefined")
			self[key] = value;
		return value;
	},
	
	
	/**
	 * Returns the value of a global variable under a namespaced path.
	 * 
	 * @param {string} path namespaced path identifier of variable
	 * @return value of global variable or undefined if not existing
	 * 
	 * @example
	 * // returns window.foo.bar / global.foo.bar 
	 * Globals.getPath("foo.bar")
	 */
	getPath: function (path/* : string */) {
		if (!path)
			return this.get();
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
	},


	/**
	 * Sets a global variable under a namespaced path.
	 * 
	 * @param {string} path namespaced path identifier of variable
	 * @param value value to be set
	 * @return value that has been set
	 * 
	 * @example
	 * // sets window.foo.bar / global.foo.bar 
	 * Globals.setPath("foo.bar", 42);
	 */
	setPath: function (path/* : string */, value) {
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
	}
	
};}).call(this);
/*::
declare module Helper {
	declare function extend<A, B>(a: A, b: B): A & B;
}
*/

var Helper = (function () {  
/** 
 * This helper module provides auxiliary functions for the Scoped system.
 * 
 * @module Helper
 * @access private
 */
return { 
		
	/**
	 * Attached a context to a function.
	 * 
	 * @param {object} obj context for the function
	 * @param {function} func function
	 * 
	 * @return function with attached context
	 */
	method: function (obj, func) {
		return function () {
			return func.apply(obj, arguments);
		};
	},

	
	/**
	 * Extend a base object with all attributes of a second object.
	 * 
	 * @param {object} base base object
	 * @param {object} overwrite second object
	 * 
	 * @return {object} extended base object
	 */
	extend: function (base, overwrite) {
		base = base || {};
		overwrite = overwrite || {};
		for (var key in overwrite)
			base[key] = overwrite[key];
		return base;
	},
	
	
	/**
	 * Returns the type of an object, particulary returning 'array' for arrays.
	 * 
	 * @param obj object in question
	 * 
	 * @return {string} type of object
	 */
	typeOf: function (obj) {
		return Object.prototype.toString.call(obj) === '[object Array]' ? "array" : typeof obj;
	},
	
	
	/**
	 * Returns whether an object is null, undefined, an empty array or an empty object.
	 * 
	 * @param obj object in question
	 * 
	 * @return true if object is empty
	 */
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
	
	
    /**
     * Matches function arguments against some pattern.
     * 
     * @param {array} args function arguments
     * @param {object} pattern typed pattern
     * 
     * @return {object} matched arguments as associative array 
     */	
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
	
	
	/**
	 * Stringifies a value as JSON and functions to string representations.
	 * 
	 * @param value value to be stringified
	 * 
	 * @return stringified value
	 */
	stringify: function (value) {
		if (this.typeOf(value) == "function")
			return "" + value;
		return JSON.stringify(value);
	}	

	
};}).call(this);
var Attach = (function () {  
/** 
 * This module provides functionality to attach the Scoped system to the environment.
 * 
 * @module Attach
 * @access private
 */
return { 
		
	__namespace: "Scoped",
	__revert: null,
	
	
	/**
	 * Upgrades a pre-existing Scoped system to the newest version present. 
	 * 
	 * @param {string} namespace Optional namespace (default is 'Scoped')
	 * @return {object} the attached Scoped system
	 */
	upgrade: function (namespace/* : ?string */) {
		var current = Globals.get(namespace || Attach.__namespace);
		if (current && Helper.typeOf(current) == "object" && current.guid == this.guid && Helper.typeOf(current.version) == "string") {
			var my_version = this.version.split(".");
			var current_version = current.version.split(".");
			var newer = false;
			for (var i = 0; i < Math.min(my_version.length, current_version.length); ++i) {
				newer = parseInt(my_version[i], 10) > parseInt(current_version[i], 10);
				if (my_version[i] != current_version[i]) 
					break;
			}
			return newer ? this.attach(namespace) : current;				
		} else
			return this.attach(namespace);		
	},


	/**
	 * Attaches the Scoped system to the environment. 
	 * 
	 * @param {string} namespace Optional namespace (default is 'Scoped')
	 * @return {object} the attached Scoped system
	 */
	attach : function(namespace/* : ?string */) {
		if (namespace)
			Attach.__namespace = namespace;
		var current = Globals.get(Attach.__namespace);
		if (current == this)
			return this;
		Attach.__revert = current;
		if (current) {
			try {
				var exported = current.__exportScoped();
				this.__exportBackup = this.__exportScoped();
				this.__importScoped(exported);
			} catch (e) {
				// We cannot upgrade the old version.
			}
		}
		Globals.set(Attach.__namespace, this);
		return this;
	},
	

	/**
	 * Detaches the Scoped system from the environment. 
	 * 
	 * @param {boolean} forceDetach Overwrite any attached scoped system by null.
	 * @return {object} the detached Scoped system
	 */
	detach: function (forceDetach/* : ?boolean */) {
		if (forceDetach)
			Globals.set(Attach.__namespace, null);
		if (typeof Attach.__revert != "undefined")
			Globals.set(Attach.__namespace, Attach.__revert);
		delete Attach.__revert;
		if (Attach.__exportBackup)
			this.__importScoped(Attach.__exportBackup);
		return this;
	},
	

	/**
	 * Exports an object as a module if possible. 
	 * 
	 * @param {object} mod a module object (optional, default is 'module')
	 * @param {object} object the object to be exported
	 * @param {boolean} forceExport overwrite potentially pre-existing exports
	 * @return {object} the Scoped system
	 */
	exports: function (mod, object, forceExport) {
		mod = mod || (typeof module != "undefined" ? module : null);
		if (typeof mod == "object" && mod && "exports" in mod && (forceExport || mod.exports == this || !mod.exports || Helper.isEmpty(mod.exports)))
			mod.exports = object || this;
		return this;
	}	

};}).call(this);

function newNamespace (opts/* : {tree ?: boolean, global ?: boolean, root ?: Object} */) {

	var options/* : {
		tree: boolean,
	    global: boolean,
	    root: Object
	} */ = {
		tree: typeof opts.tree === "boolean" ? opts.tree : false,
		global: typeof opts.global === "boolean" ? opts.global : false,
		root: typeof opts.root === "object" ? opts.root : {}
	};

	/*::
	type Node = {
		route: ?string,
		parent: ?Node,
		children: any,
		watchers: any,
		data: any,
		ready: boolean,
		lazy: any
	};
	*/

	function initNode(options)/* : Node */ {
		return {
			route: typeof options.route === "string" ? options.route : null,
			parent: typeof options.parent === "object" ? options.parent : null,
			ready: typeof options.ready === "boolean" ? options.ready : false,
			children: {},
			watchers: [],
			data: {},
			lazy: []
		};
	}
	
	var nsRoot = initNode({ready: true});
	
	if (options.tree) {
		if (options.global) {
			try {
				if (window)
					nsRoot.data = window;
			} catch (e) { }
			try {
				if (global)
					nsRoot.data = global;
			} catch (e) { }
			try {
				if (self)
					nsRoot.data = self;
			} catch (e) { }
		} else
			nsRoot.data = options.root;
	}
	
	function nodeDigest(node/* : Node */) {
		if (node.ready)
			return;
		if (node.parent && !node.parent.ready) {
			nodeDigest(node.parent);
			return;
		}
		if (node.route && node.parent && (node.route in node.parent.data)) {
			node.data = node.parent.data[node.route];
			node.ready = true;
			for (var i = 0; i < node.watchers.length; ++i)
				node.watchers[i].callback.call(node.watchers[i].context || this, node.data);
			node.watchers = [];
			for (var key in node.children)
				nodeDigest(node.children[key]);
		}
	}
	
	function nodeEnforce(node/* : Node */) {
		if (node.ready)
			return;
		if (node.parent && !node.parent.ready)
			nodeEnforce(node.parent);
		node.ready = true;
		if (node.parent) {
			if (options.tree && typeof node.parent.data == "object")
				node.parent.data[node.route] = node.data;
		}
		for (var i = 0; i < node.watchers.length; ++i)
			node.watchers[i].callback.call(node.watchers[i].context || this, node.data);
		node.watchers = [];
	}
	
	function nodeSetData(node/* : Node */, value) {
		if (typeof value == "object" && node.ready) {
			for (var key in value)
				node.data[key] = value[key];
		} else
			node.data = value;
		if (typeof value == "object") {
			for (var ckey in value) {
				if (node.children[ckey])
					node.children[ckey].data = value[ckey];
			}
		}
		nodeEnforce(node);
		for (var k in node.children)
			nodeDigest(node.children[k]);
	}
	
	function nodeClearData(node/* : Node */) {
		if (node.ready && node.data) {
			for (var key in node.data)
				delete node.data[key];
		}
	}
	
	function nodeNavigate(path/* : ?String */) {
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
	
	function nodeAddWatcher(node/* : Node */, callback, context) {
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
	
	function nodeUnresolvedWatchers(node/* : Node */, base, result) {
		node = node || nsRoot;
		result = result || [];
		if (!node.ready && node.lazy.length === 0 && node.watchers.length > 0)
			result.push(base);
		for (var k in node.children) {
			var c = node.children[k];
			var r = (base ? base + "." : "") + c.route;
			result = nodeUnresolvedWatchers(c, r, result);
		}
		return result;
	}

	/** 
	 * The namespace module manages a namespace in the Scoped system.
	 * 
	 * @module Namespace
	 * @access public
	 */
	return {
		
		/**
		 * Extend a node in the namespace by an object.
		 * 
		 * @param {string} path path to the node in the namespace
		 * @param {object} value object that should be used for extend the namespace node
		 */
		extend: function (path, value) {
			nodeSetData(nodeNavigate(path), value);
		},
		
		/**
		 * Set the object value of a node in the namespace.
		 * 
		 * @param {string} path path to the node in the namespace
		 * @param {object} value object that should be used as value for the namespace node
		 */
		set: function (path, value) {
			var node = nodeNavigate(path);
			if (node.data)
				nodeClearData(node);
			nodeSetData(node, value);
		},
		
		/**
		 * Read the object value of a node in the namespace.
		 * 
		 * @param {string} path path to the node in the namespace
		 * @return {object} object value of the node or null if undefined
		 */
		get: function (path) {
			var node = nodeNavigate(path);
			return node.ready ? node.data : null;
		},
		
		/**
		 * Lazily navigate to a node in the namespace.
		 * Will asynchronously call the callback as soon as the node is being touched.
		 *
		 * @param {string} path path to the node in the namespace
		 * @param {function} callback callback function accepting the node's object value
		 * @param {context} context optional callback context
		 */
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
		
		/**
		 * Digest a node path, checking whether it has been defined by an external system.
		 * 
		 * @param {string} path path to the node in the namespace
		 */
		digest: function (path) {
			nodeDigest(nodeNavigate(path));
		},
		
		/**
		 * Asynchronously access a node in the namespace.
		 * Will asynchronously call the callback as soon as the node is being defined.
		 *
		 * @param {string} path path to the node in the namespace
		 * @param {function} callback callback function accepting the node's object value
		 * @param {context} context optional callback context
		 */
		obtain: function (path, callback, context) {
			nodeAddWatcher(nodeNavigate(path), callback, context);
		},
		
		/**
		 * Returns all unresolved watchers under a certain path.
		 * 
		 * @param {string} path path to the node in the namespace
		 * @return {array} list of all unresolved watchers 
		 */
		unresolvedWatchers: function (path) {
			return nodeUnresolvedWatchers(nodeNavigate(path), path);
		},
		
		__export: function () {
			return {
				options: options,
				nsRoot: nsRoot
			};
		},
		
		__import: function (data) {
			options = data.options;
			nsRoot = data.nsRoot;
		}
		
	};
	
}
function newScope (parent, parentNS, rootNS, globalNS) {
	
	var self = this;
	var nextScope = null;
	var childScopes = [];
	var parentNamespace = parentNS;
	var rootNamespace = rootNS;
	var globalNamespace = globalNS;
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
                var _arguments = [];
                for (var a = 0; a < arguments.length; ++a)
                    _arguments.push(arguments[a]);
                _arguments[_arguments.length - 1].ns = ns;
				if (this.options.compile) {
					var params = [];
					for (var i = 0; i < argmts.length; ++i)
						params.push(Helper.stringify(argmts[i]));
					this.compiled += this.options.ident + "." + name + "(" + params.join(", ") + ");\n\n";
				}
				if (this.options.dependencies) {
					this.dependencies[ns.path] = this.dependencies[ns.path] || {};
					if (args.dependencies) {
						args.dependencies.forEach(function (dep) {
							this.dependencies[ns.path][this.resolve(dep).path] = true;
						}, this);
					}
					if (args.hiddenDependencies) {
						args.hiddenDependencies.forEach(function (dep) {
							this.dependencies[ns.path][this.resolve(dep).path] = true;
						}, this);
					}
				}
				var result = this.options.compile ? {} : args.callback.apply(args.context || this, _arguments);
				callback.call(this, ns, result);
			}, this);
		};
		
		if (options.lazy)
			ns.namespace.lazy(ns.path, execute, this);
		else
			execute.apply(this);

		return this;
	};
	
	/** 
	 * This module provides all functionality in a scope.
	 * 
	 * @module Scoped
	 * @access public
	 */
	return {
		
		getGlobal: Helper.method(Globals, Globals.getPath),
		setGlobal: Helper.method(Globals, Globals.setPath),
		
		options: {
			lazy: false,
			ident: "Scoped",
			compile: false,
			dependencies: false
		},
		
		compiled: "",
		
		dependencies: {},
		
		
		/**
		 * Returns a reference to the next scope that will be obtained by a subScope call.
		 * 
		 * @return {object} next scope
		 */
		nextScope: function () {
			if (!nextScope)
				nextScope = newScope(this, localNamespace, rootNamespace, globalNamespace);
			return nextScope;
		},
		
		/**
		 * Creates a sub scope of the current scope and returns it.
		 * 
		 * @return {object} sub scope
		 */
		subScope: function () {
			var sub = this.nextScope();
			childScopes.push(sub);
			nextScope = null;
			return sub;
		},
		
		/**
		 * Creates a binding within in the scope. 
		 * 
		 * @param {string} alias identifier of the new binding
		 * @param {string} namespaceLocator identifier of an existing namespace path
		 * @param {object} options options for the binding
		 * 
		 */
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
		
		
		/**
		 * Resolves a name space locator to a name space.
		 * 
		 * @param {string} namespaceLocator name space locator
		 * @return {object} resolved name space
		 * 
		 */
		resolve: function (namespaceLocator) {
			var parts = namespaceLocator.split(":");
			if (parts.length == 1) {
                throw ("The locator '" + parts[0] + "' requires a namespace.");
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

		
		/**
		 * Defines a new name space once a list of name space locators is available.
		 * 
		 * @param {string} namespaceLocator the name space that is to be defined
		 * @param {array} dependencies a list of name space locator dependencies (optional)
		 * @param {array} hiddenDependencies a list of hidden name space locators (optional)
		 * @param {function} callback a callback function accepting all dependencies as arguments and returning the new definition
		 * @param {object} context a callback context (optional)
		 * 
		 */
		define: function () {
			return custom.call(this, arguments, "define", function (ns, result) {
				if (ns.namespace.get(ns.path))
					throw ("Scoped namespace " + ns.path + " has already been defined. Use extend to extend an existing namespace instead");
				ns.namespace.set(ns.path, result);
			});
		},
		
		
		/**
		 * Assume a specific version of a module and fail if it is not met.
		 * 
		 * @param {string} assumption name space locator
		 * @param {string} version assumed version
		 * 
		 */
		assumeVersion: function () {
			var args = Helper.matchArgs(arguments, {
				assumption: true,
				dependencies: "array",
				callback: true,
				context: "object",
				error: "string"
			});
			var dependencies = args.dependencies || [];
			dependencies.unshift(args.assumption);
			this.require(dependencies, function () {
				var argv = arguments;
				var assumptionValue = argv[0].replace(/[^\d\.]/g, "");
				argv[0] = assumptionValue.split(".");
				for (var i = 0; i < argv[0].length; ++i)
					argv[0][i] = parseInt(argv[0][i], 10);
				if (Helper.typeOf(args.callback) === "function") {
					if (!args.callback.apply(args.context || this, args))
						throw ("Scoped Assumption '" + args.assumption + "' failed, value is " + assumptionValue + (args.error ? ", but assuming " + args.error : ""));
				} else {
					var version = (args.callback + "").replace(/[^\d\.]/g, "").split(".");
					for (var j = 0; j < Math.min(argv[0].length, version.length); ++j)
						if (parseInt(version[j], 10) > argv[0][j])
							throw ("Scoped Version Assumption '" + args.assumption + "' failed, value is " + assumptionValue + ", but assuming at least " + args.callback);
				}
			});
		},
		
		
		/**
		 * Extends a potentiall existing name space once a list of name space locators is available.
		 * 
		 * @param {string} namespaceLocator the name space that is to be defined
		 * @param {array} dependencies a list of name space locator dependencies (optional)
		 * @param {array} hiddenDependencies a list of hidden name space locators (optional)
		 * @param {function} callback a callback function accepting all dependencies as arguments and returning the new additional definitions.
		 * @param {object} context a callback context (optional)
		 * 
		 */
		extend: function () {
			return custom.call(this, arguments, "extend", function (ns, result) {
				ns.namespace.extend(ns.path, result);
			});
		},
				
		
		/**
		 * Requires a list of name space locators and calls a function once they are present.
		 * 
		 * @param {array} dependencies a list of name space locator dependencies (optional)
		 * @param {array} hiddenDependencies a list of hidden name space locators (optional)
		 * @param {function} callback a callback function accepting all dependencies as arguments
		 * @param {object} context a callback context (optional)
		 * 
		 */
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

		
		/**
		 * Digest a name space locator, checking whether it has been defined by an external system.
		 * 
		 * @param {string} namespaceLocator name space locator
		 */
		digest: function (namespaceLocator) {
			var ns = this.resolve(namespaceLocator);
			ns.namespace.digest(ns.path);
			return this;
		},
		
		
		/**
		 * Returns all unresolved definitions under a namespace locator
		 * 
		 * @param {string} namespaceLocator name space locator, e.g. "global:"
		 * @return {array} list of all unresolved definitions 
		 */
		unresolved: function (namespaceLocator) {
			var ns = this.resolve(namespaceLocator);
			return ns.namespace.unresolvedWatchers(ns.path);
		},
		
		/**
		 * Exports the scope.
		 * 
		 * @return {object} exported scope
		 */
		__export: function () {
			return {
				parentNamespace: parentNamespace.__export(),
				rootNamespace: rootNamespace.__export(),
				globalNamespace: globalNamespace.__export(),
				localNamespace: localNamespace.__export(),
				privateNamespace: privateNamespace.__export()
			};
		},
		
		/**
		 * Imports a scope from an exported scope.
		 * 
		 * @param {object} data exported scope to be imported
		 * 
		 */
		__import: function (data) {
			parentNamespace.__import(data.parentNamespace);
			rootNamespace.__import(data.rootNamespace);
			globalNamespace.__import(data.globalNamespace);
			localNamespace.__import(data.localNamespace);
			privateNamespace.__import(data.privateNamespace);
		}
		
	};
	
}
var globalNamespace = newNamespace({tree: true, global: true});
var rootNamespace = newNamespace({tree: true});
var rootScope = newScope(null, rootNamespace, rootNamespace, globalNamespace);

var Public = Helper.extend(rootScope, (function () {  
/** 
 * This module includes all public functions of the Scoped system.
 * 
 * It includes all methods of the root scope and the Attach module.
 * 
 * @module Public
 * @access public
 */
return {
		
	guid: "4b6878ee-cb6a-46b3-94ac-27d91f58d666",
	version: '0.0.19',
		
	upgrade: Attach.upgrade,
	attach: Attach.attach,
	detach: Attach.detach,
	exports: Attach.exports,
	
	/**
	 * Exports all data contained in the Scoped system.
	 * 
	 * @return data of the Scoped system.
	 * @access private
	 */
	__exportScoped: function () {
		return {
			globalNamespace: globalNamespace.__export(),
			rootNamespace: rootNamespace.__export(),
			rootScope: rootScope.__export()
		};
	},
	
	/**
	 * Import data into the Scoped system.
	 * 
	 * @param data of the Scoped system.
	 * @access private
	 */
	__importScoped: function (data) {
		globalNamespace.__import(data.globalNamespace);
		rootNamespace.__import(data.rootNamespace);
		rootScope.__import(data.rootScope);
	}
	
};

}).call(this));

Public = Public.upgrade();
Public.exports();
	return Public;
}).call(this);
/*!
betajs-data - v1.0.111 - 2018-07-28
Copyright (c) Oliver Friedmann
Apache-2.0 Software License.
*/

(function () {
var Scoped = this.subScope();
Scoped.binding('module', 'global:BetaJS.Data');
Scoped.binding('base', 'global:BetaJS');
Scoped.define("module:", function () {
	return {
    "guid": "70ed7146-bb6d-4da4-97dc-5a8e2d23a23f",
    "version": "1.0.111"
};
});
Scoped.assumeVersion('base:version', '~1.0.141');
/**
 * @class AbstractQueryCollection
 *
 * A base class for querying collections. Subclasses specify the expected type
 * of data store and specify whether the query collection is active.
 */
Scoped.define("module:Collections.AbstractQueryCollection", [
    "base:Collections.Collection",
    "base:Objs",
    "base:Types",
    "base:Comparators",
    "base:Promise",
    "base:Class",
    "module:Queries.Constrained",
    "module:Queries",
    "module:Queries.ConstrainedQueryBuilder"
], function(Collection, Objs, Types, Comparators, Promise, Class, Constrained, Queries, ConstrainedQueryBuilder, scoped) {
    return Collection.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            /**
             * @method constructor
             *
             * @param {object} source The source object
             * can either be an instance of a Table
             * or a Store. A Table should be used if validations and other data
             * processing methods are desired. A Store is sufficient if just
             * performing simple queries and returning the results with little
             * manipulation.
             *
             * @param {object} query The query object contains keys specifying query
             * parameters and values specifying their respective values. This query
             * object can be updated later with the `set_query` method.
             *
             * @param {object} options The options object contains keys specifying
             * option parameters and values specifying their respective values.
             *
             * @return {QueryCollection} A new instance of QueryCollection.
             */
            constructor: function(source, query, options) {
                options = options || {};
                inherited.constructor.call(this, {
                    release_references: true,
                    uniqueness: options.uniqueness,
                    indices: options.indices
                });
                if (ConstrainedQueryBuilder.is_instance_of(query)) {
                    this._rangeQueryBuilder = options.range_query_builder;
                    this.__queryBuilder = query;
                    query = this.__queryBuilder.getQuery();
                    if (this._rangeQueryBuilder)
                        query = Objs.extend(query, this._rangeQueryBuilder.getQuery());
                    options = Objs.extend(options, this.__queryBuilder.getOptions());
                    this.__queryBuilder.on("change", function() {
                        var cQ = this.__queryBuilder.getConstrainedQuery();
                        if (this._rangeQueryBuilder)
                            cQ.query = Objs.extend(this._rangeQueryBuilder.getQuery(), cQ.query);
                        this.update(cQ);
                    }, this);
                    if (this._rangeQueryBuilder) {
                        this._rangeQueryBuilder.on("change", function() {
                            var cQ = this.__queryBuilder.getConstrainedQuery();
                            this.rangeSuperQueryIncrease(Objs.extend(this._rangeQueryBuilder.getQuery(), cQ.query));
                        }, this);
                    }
                }
                this._id_key = this._id_key || options.id_key || "id";
                this._secondary_ident = options.secondary_ident;
                this._source = source;
                this._complete = false;
                this._active = options.active || false;
                this._incremental = "incremental" in options ? options.incremental : true;
                this._active_bounds = "active_bounds" in options ? options.active_bounds : true;
                this._bounds_attribute = options.bounds_attribute;
                this._enabled = false;
                this._range = options.range || null;
                this._forward_steps = options.forward_steps || null;
                this._backward_steps = options.backward_steps || null;
                this._async = options.async || false;
                this._active_in_direction = "active_in_direction" in options ? options.active_in_direction : false;
                if (this._active) {
                    this.on("add", function(object) {
                        this._watchItem(object.get(this._id_key));
                    }, this);
                    this.on("remove", function(object) {
                        this._unwatchItem(object.get(this._id_key));
                    }, this);
                }
                this._query = {
                    query: {},
                    options: {
                        skip: 0,
                        limit: null,
                        sort: null
                    }
                };
                this.update(Objs.tree_extend({
                    query: {},
                    options: {
                        skip: options.skip || 0,
                        limit: options.limit || options.range || null,
                        sort: options.sort || null
                    }
                }, query ? (query.query || query.options ? query : {
                    query: query
                }) : {}));
                if (options.auto)
                    this.enable();
            },

            destroy: function() {
                this.disable();
                if (this._watcher()) {
                    this._watcher().unwatchInsert(null, this);
                    this._watcher().unwatchItem(null, this);
                }
                if (this.__queryBuilder)
                    this.__queryBuilder.off(null, null, this);
                inherited.destroy.call(this);
            },

            /**
             * @method source
             *
             * Returns the source (a store or a table)
             *
             * @return {object} Data source
             */

            source: function() {
                return this._source;
            },

            /**
             * @method paginate
             *
             * Paginate to a specific page.
             *
             * @param {int} index The page to paginate to.
             *
             * @return {Promise} Promise from query execution.
             */

            paginate: function(index) {
                return this.update({
                    options: {
                        skip: index * this._range,
                        limit: this._range
                    }
                });
            },

            /**
             * @method paginate_index
             *
             * @return {int} Current pagination page.
             */
            paginate_index: function() {
                return Math.floor(this.getSkip() / this._range);
            },

            /**
             * @method paginate_next
             *
             * Update the query to paginate to the next page.
             *
             * @return {Promise} Promise of the query.
             */
            paginate_next: function() {
                return this.isComplete() ? Promise.create(true) : this.paginate(this.paginate_index() + 1);
            },

            /**
             * @method paginate_prev
             *
             * Update the query to paginate to the previous page.
             *
             * @return {Promise} Promise of the query.
             */
            paginate_prev: function() {
                return this.paginate_index() > 0 ? this.paginate(this.paginate_index() - 1) : Promise.create(true);
            },

            increase_forwards: function(steps) {
                steps = steps || this._forward_steps;
                return this.isComplete() ? Promise.create(true) : this.update({
                    options: {
                        limit: this.getLimit() + steps
                    }
                });
            },

            increase_backwards: function(steps) {
                steps = steps || this._backward_steps;
                return !this.getSkip() ? Promise.create(true) : this.update({
                    options: {
                        skip: Math.max(this.getSkip() - steps, 0),
                        limit: this.getLimit() ? this.getLimit() + this.getSkip() - Math.max(this.getSkip() - steps, 0) : null
                    }
                });
            },

            bounds_forwards: function(newUpperBound) {
                var oldUpperBound = this._query.query[this._bounds_attribute].$lt;
                this._query.query[this._bounds_attribute].$lt = newUpperBound;
                var queryCopy = Objs.clone(this._query.query, 2);
                queryCopy[this._bounds_attribute].$gte = oldUpperBound;
                return this._execute({
                    query: queryCopy
                }, true);
            },

            bounds_backwards: function(newLowerBound) {
                var oldLowerBound = this._query.query[this._bounds_attribute].$gte;
                this._query.query[this._bounds_attribute].$gte = newLowerBound;
                var queryCopy = Objs.clone(this._query.query, 2);
                queryCopy[this._bounds_attribute].$lt = oldLowerBound;
                return this._execute({
                    query: queryCopy
                }, true);
            },

            get_ident: function(obj) {
                var result = Class.is_class_instance(obj) ? obj.get(this._id_key) : obj[this._id_key];
                if (!result && this._secondary_ident)
                    result = this._secondary_ident(obj);
                return result;
            },

            getQuery: function() {
                return this._query;
            },

            getSkip: function() {
                return this._query.options.skip || 0;
            },

            getLimit: function() {
                return this._query.options.limit || null;
            },

            /**
             * @method update
             *
             * Update the collection with a new query. Setting the query not only
             * updates the query field, but also updates the data with the results of
             * the new query.
             *
             * @param {object} constrainedQuery The new query for this collection.
             *
             * @example
             * // Updates the query dictating the collection contents.
             * collectionQuery.update({query: {'queryField': 'queryValue'}, options: {skip: 10}});
             */
            update: function(constrainedQuery) {
                this.trigger("collection-updating");
                return this.__update(constrainedQuery).callback(function() {
                    this.trigger("collection-updated");
                }, this);
            },

            __update: function(constrainedQuery) {
                var hasQuery = !!constrainedQuery.query;
                constrainedQuery = Constrained.rectify(constrainedQuery);
                var currentSkip = this._query.options.skip || 0;
                var currentLimit = this._query.options.limit || null;
                if (hasQuery)
                    this._query.query = constrainedQuery.query;
                this._query.options = Objs.extend(this._query.options, constrainedQuery.options);
                if (!this._enabled)
                    return Promise.create(true);
                if (hasQuery || "sort" in constrainedQuery.options || !this._incremental)
                    return this.refresh(true);
                var nextSkip = "skip" in constrainedQuery.options ? constrainedQuery.options.skip || 0 : currentSkip;
                var nextLimit = "limit" in constrainedQuery.options ? constrainedQuery.options.limit || null : currentLimit;
                if (nextSkip === currentSkip && nextLimit === currentLimit)
                    return Promise.create(true);
                // No overlap
                if ((nextLimit && nextSkip + nextLimit <= currentSkip) || (currentLimit && currentSkip + currentLimit <= nextSkip))
                    return this.refresh(true);
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
                    promise = this._execute(Objs.tree_extend(Objs.clone(this._query, 2), {
                        options: {
                            skip: nextSkip,
                            limit: leftLimit
                        }
                    }, 2), true);
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
                return promise.and(this._execute(Objs.tree_extend(Objs.clone(this._query, 2), {
                    options: {
                        skip: currentSkip + currentLimit,
                        limit: !nextLimit ? null : nextLimit - currentLimit
                    }
                }, 2), true));
            },

            enable: function() {
                if (this._enabled)
                    return;
                this._enabled = true;
                this.refresh();
            },

            disable: function() {
                if (!this._enabled)
                    return;
                this._enabled = false;
                this.clear();
                this._unwatchInsert();
            },

            refresh: function(clear) {
                if (clear && !this._incremental)
                    this.clear();
                if (this._query.options.sort && !Types.is_empty(this._query.options.sort)) {
                    this.set_compare(Comparators.byObject(this._query.options.sort));
                } else {
                    this.set_compare(null);
                }
                this._unwatchInsert();
                if (this._active)
                    this._watchInsert(this._query);
                return this._execute(this._query, !(clear && this._incremental));
            },

            rangeSuperQueryIncrease: function(query) {
                var diffQuery = Queries.rangeSuperQueryDiffQuery(query, this._query.query);
                if (!diffQuery)
                    throw "Range Super Query expected";
                this._query.query = query;
                this._unwatchInsert();
                if (this._active)
                    this._watchInsert(this._query);
                return this._execute({
                    query: diffQuery,
                    options: this._query.options
                }, true);
            },

            isEnabled: function() {
                return this._enabled;
            },

            /**
             * @method _execute
             *
             * Execute a constrained query. This method is called whenever a new query is set.
             * Doesn't override previous reults.
             *
             * @protected
             *
             * @param {constrainedQuery} constrainedQuery The constrained query that should be executed
             *
             * @return {Promise} Promise from executing query.
             */
            _execute: function(constrainedQuery, keep_others) {
                if (this.__executePromise) {
                    return this.__executePromise.mapCallback(function() {
                        return this._execute(constrainedQuery, keep_others);
                    }, this);
                }
                return this._subExecute(constrainedQuery.query, constrainedQuery.options).mapSuccess(function(iter) {
                    if (!keep_others || !this._async) {
                        this.replace_objects(iter.asArray(), keep_others);
                        return true;
                    }
                    if (!iter.hasNext()) {
                        this._complete = true;
                        iter.destroy();
                        return true;
                    }
                    this.__executePromise = iter.asyncIterate(this.replace_object, this);
                    this.__executePromise.callback(function() {
                        this.__executePromise = null;
                    }, this);
                    return true;
                }, this);
            },

            /**
             * @method _sub_execute
             *
             * Run the specified query on the data source.
             *
             * @private
             *
             * @param {object} options The options for the subquery.
             *
             * @return {object} Iteratable object containing query results.
             */
            _subExecute: function(query, options) {
                return this._source.query(query, options);
            },

            /**
             * @method isComplete
             *
             * @return {boolean} Return value indicates if the query has finished/if
             * data has been returned.
             */
            isComplete: function() {
                return this._complete;
            },

            isValid: function(data) {
                return Queries.evaluate(this._query.query, data);
            },

            _materialize: function(data) {
                return data;
            },

            _activeCreate: function(data) {
                if (!this._active || !this._enabled)
                    return;
                if (!this.isValid(data))
                    return;
                if (this._active_in_direction && this._query.options.sort && this._query.options.limit && this.count() >= this._query.options.limit) {
                    var item = this.getByIndex(this.count() - 1).getAll();
                    var comp = Comparators.byObject(this._query.options.sort);
                    if (comp(item, data) < 0)
                        return;
                }
                this.add(this._materialize(data));
                if (this._query.options.limit && this.count() > this._query.options.limit) {
                    if (this._active_bounds)
                        this._query.options.limit++;
                    else
                        this.remove(this.getByIndex(this.count() - 1));
                }
            },

            _activeRemove: function(id) {
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

            _activeUpdate: function(id, data, row) {
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
            },

            _watcher: function() {
                return null;
            },

            _watchInsert: function(query) {
                if (this._watcher())
                    this._watcher().watchInsert(query, this);
            },

            _unwatchInsert: function() {
                if (this._watcher())
                    this._watcher().unwatchInsert(null, this);
            },

            _watchItem: function(id) {
                if (this._watcher())
                    this._watcher().watchItem(id, this);
            },

            _unwatchItem: function(id) {
                if (this._watcher())
                    this._watcher().unwatchItem(id, this);
            }

        };
    });
});
Scoped.define("module:Collections.StoreQueryCollection", [
    "module:Collections.AbstractQueryCollection",
    "base:Objs"
], function(QueryCollection, Objs, scoped) {
    return QueryCollection.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(source, query, options) {
                inherited.constructor.call(this, source, query, Objs.extend({
                    id_key: source.id_key()
                }, options));
                this._source = source;
                source.on("insert", this._activeCreate, this);
                source.on("remove", this._activeRemove, this);
                source.on("update", function(row, data) {
                    this._activeUpdate(source.id_of(row), data, row);
                }, this);
            },

            destroy: function() {
                this._source.off(null, null, this);
                inherited.destroy.call(this);
            },

            get_ident: function(obj) {
                return obj.get(this._source.id_key());
            },

            _watcher: function() {
                return this._source.watcher();
            }

        };
    });
});
Scoped.define("module:Collections.TableQueryCollection", [
    "module:Collections.AbstractQueryCollection",
    "base:Objs"
], function(QueryCollection, Objs, scoped) {
    return QueryCollection.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(source, query, options) {
                inherited.constructor.call(this, source, query, Objs.extend({
                    id_key: source.primary_key()
                }, options));
                source.on("create", this._activeCreate, this);
                source.on("remove", this._activeRemove, this);
                source.on("update", this._activeUpdate, this);
            },

            destroy: function() {
                this._source.off(null, null, this);
                inherited.destroy.call(this);
            },

            _materialize: function(data) {
                return this._source.materialize(data);
            },

            _watcher: function() {
                return this._source.store().watcher();
            }

        };
    });
});
Scoped.define("module:Stores.DatabaseStore", [
    "module:Stores.BaseStore",
    "base:Objs",
    "module:Queries",
    "module:Queries.Constrained",
    "base:Iterators.MappedIterator"
], function(BaseStore, Objs, Queries, ConstrainedQueries, MappedIterator, scoped) {
    return BaseStore.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(database, table_name, id_key, separate_ids) {
                this.__database = database;
                this.__table_name = table_name;
                this.__table = this.__database.getTable(this.__table_name);
                inherited.constructor.call(this, {
                    id_key: id_key || this.__table.primary_key()
                });
                this.__separate_ids = separate_ids;
                this.__map_ids = !this.__separate_ids && this.id_key() != this.__table.primary_key();
            },

            table: function() {
                return this.__table;
            },

            _remove: function(id) {
                return this.__separate_ids ? this.table().removeRow(this.id_row(id)) : this.table().removeById(id);
            },

            _get: function(id) {
                var promise = this.__separate_ids ? this.table().findOne(this.id_row(id)) : this.table().findById(id);
                return this.__map_ids ? promise.mapSuccess(function(data) {
                    if (data) {
                        data[this.id_key()] = data[this.table().primary_key()];
                        delete data[this.table().primary_key()];
                    }
                    return data;
                }, this) : promise;
            },

            _update: function(id, data) {
                var promise = this.__separate_ids ?
                    this.table().updateRow(this.id_row(id), data) :
                    this.table().updateById(id, data);
                return promise;
            },

            _query_capabilities: function() {
                return ConstrainedQueries.fullConstrainedQueryCapabilities(Queries.fullQueryCapabilities());
            },

            _insert: function(data) {
                var promise = this.table().insertRow(data);
                return this.__map_ids ? promise.mapSuccess(function(data) {
                    data[this.id_key()] = data[this.table().primary_key()];
                    delete data[this.table().primary_key()];
                    return data;
                }, this) : promise;
            },

            _query: function(query, options) {
                if (this.__map_ids && query[this.id_key()]) {
                    query = Objs.clone(query, 1);
                    query[this.table().primary_key()] = query[this.id_key()];
                    delete query[this.id_key()];
                }
                var promise = this.table().find(query, options);
                return this.__map_ids ? promise.mapSuccess(function(results) {
                    return (new MappedIterator(results, function(data) {
                        data[this.id_key()] = data[this.table().primary_key()];
                        delete data[this.table().primary_key()];
                        return data;
                    }, this)).auto_destroy(results, true);
                }, this) : promise;
            },

            _ensure_index: function(key) {
                this.table().ensureIndex(key);
            },

            clear: function(ctx) {
                return ctx ? inherited.clear.call(ctx) : this.table().clear();
            }

        };
    });
});
Scoped.define("module:Databases.DatabaseTable", [
    "base:Class",
    "base:Objs",
    "base:Iterators.MappedIterator"
], function(Class, Objs, MappedIterator, scoped) {
    return Class.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(database, table_name) {
                inherited.constructor.call(this);
                this._database = database;
                this._table_name = table_name;
            },

            primary_key: function() {
                return "id";
            },

            findOne: function(query, options) {
                return this._findOne(this._encode(query), options).mapSuccess(function(result) {
                    return !result ? null : this._decode(result);
                }, this);
            },

            _findOne: function(query, options) {
                options = options || {};
                options.limit = 1;
                return this._find(query, options).mapSuccess(function(result) {
                    var item = result.next();
                    result.destroy();
                    return item;
                });
            },

            _encode: function(data) {
                return data;
            },

            _decode: function(data) {
                return data;
            },

            _decodeMany: function(data) {
                return data;
            },

            _find: function(query, options) {},

            find: function(query, options) {
                return this._find(this._encode(query), options).mapSuccess(function(result) {
                    return (new MappedIterator(result, this._decode, this)).auto_destroy(result, true);
                }, this);
            },

            findById: function(id) {
                return this.findOne(Objs.objectBy(this.primary_key(), id));
            },

            count: function(query) {
                return this._count(this._encode(query));
            },

            _insertRow: function(row) {},

            _insertRows: function(rows) {},

            _removeRow: function(query) {},

            _updateRow: function(query, row) {},

            _count: function(query) {
                return this.find(query).mapSuccess(function(iter) {
                    var count = 0;
                    while (iter.hasNext()) {
                        count++;
                        iter.next();
                    }
                    iter.destroy();
                    return count;
                });
            },

            insertRow: function(row) {
                return this._insertRow(this._encode(row)).mapSuccess(this._decode, this);
            },

            insertRows: function(rows) {
                var encodedRows = [];
                Objs.iter(rows, function(obj, ind) {
                    encodedRows.push(this._encode(obj));
                }, this);
                return this._insertRows(encodedRows).mapSuccess(this._decodeMany, this);
            },

            removeRow: function(query) {
                return this._removeRow(this._encode(query));
            },

            updateRow: function(query, row) {
                return this._updateRow(this._encode(query), this._encode(row)).mapSuccess(this._decode, this);
            },

            removeById: function(id) {
                return this.removeRow(Objs.objectBy(this.primary_key(), id));
            },

            updateById: function(id, data) {
                return this.updateRow(Objs.objectBy(this.primary_key(), id), data);
            },

            ensureIndex: function(key) {},

            _clear: function() {
                return this._removeRow({});
            },

            clear: function() {
                return this._clear();
            }

        };
    });
});
Scoped.define("module:Databases.Database", [
    "base:Class"
], function(Class, scoped) {
    return Class.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function() {
                inherited.constructor.apply(this);
                this.__tableCache = {};
            },

            _tableClass: function() {
                return null;
            },

            getTable: function(table_name) {
                if (!this.__tableCache[table_name]) {
                    var cls = this._tableClass();
                    this.__tableCache[table_name] = this.auto_destroy(new cls(this, table_name));
                }
                return this.__tableCache[table_name];
            }

        };

    });
});
Scoped.define("module:Databases.Migrator", [
    "base:Class",
    "base:Types"
], function(Class, Types, scoped) {
    return Class.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function() {
                inherited.constructor.call(this);
                this.__version = null;
                this.__migrations = [];
                this.__sorted = true;
            },

            version: function(offset) {
                if (!this.__version)
                    this.__version = this._getVersion();
                return this.__version;
            },

            _getVersion: function() {},

            _setVersion: function(version) {},

            _log: function(s) {},

            migrations: function() {
                if (!this.__sorted) {
                    this.__migrations.sort(function(x, y) {
                        return x.version - y.version;
                    });
                    this.__sorted = true;
                }
                return this.__migrations;
            },

            register: function(migration) {
                this.__migrations.push(migration);
                this.__sorted = false;
            },

            _indexByVersion: function(version) {
                for (var i = 0; i < this.__migrations.length; ++i) {
                    if (version == this.__migrations[i].version)
                        return i;
                    else if (version < this.__migrations[i].version)
                        return i - 1;
                }
                return this.__migrations.length;
            },

            migrate: function(version) {
                var current = this._indexByVersion(this.version());
                var target = Types.is_defined(version) ? this._indexByVersion(version) : this.__migrations.length - 1;
                while (current < target) {
                    var migration = this.__migrations[current + 1];
                    this._log("Migrate " + migration.version + ": " + migration.title + " - " + migration.description + "...\n");
                    try {
                        migration.migrate();
                        this._setVersion(this.__migrations[current + 1].version);
                        current++;
                        this._log("Successfully migrated " + migration.version + ".\n");
                    } catch (e) {
                        this._log("Failure! Rolling back " + migration.version + "...\n");
                        try {
                            if ("partial_rollback" in migration)
                                migration.partial_rollback();
                            else if ("rollback" in migration)
                                migration.rollback();
                            else
                                throw "No rollback defined";
                        } catch (ex) {
                            this._log("Failure! Couldn't roll back " + migration.version + "!\n");
                            throw ex;
                        }
                        this._log("Rolled back " + migration.version + "!\n");
                        throw e;
                    }
                }
            },

            rollback: function(version) {
                var current = this._indexByVersion(this.version());
                var target = Types.is_defined(version) ? this._indexByVersion(version) : current - 1;
                while (current > target) {
                    var migration = this.__migrations[current];
                    this._log("Rollback " + migration.version + ": " + migration.title + " - " + migration.description + "...\n");
                    try {
                        migration.rollback();
                        this._setVersion(current >= 1 ? this.__migrations[current - 1].version : 0);
                        current--;
                        this._log("Successfully rolled back " + migration.version + ".\n");
                    } catch (e) {
                        this._log("Failure! Couldn't roll back " + migration.version + "!\n");
                        throw e;
                    }
                }
            }

        };
    });
});
Scoped.define("module:Stores.AbstractIndex", [
    "base:Class",
    "base:Comparators",
    "base:Objs",
    "base:Functions"
], function(Class, Comparators, Objs, Functions, scoped) {
    return Class.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(store, key, compare, options) {
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
                store.query({}).value().iterate(function(row) {
                    this.__row_count++;
                    this._insert(row[id_key], row[key]);
                }, this);
                store.on("insert", function(row) {
                    this.__row_count++;
                    this._insert(row[id_key], row[key]);
                }, this);
                store.on("remove", function(id) {
                    this.__row_count--;
                    this._remove(id);
                }, this);
                store.on("update", function(id, data) {
                    if (key in data)
                        this._update(id, data[key]);
                }, this);
            },

            _initialize: function() {},

            destroy: function() {
                this._store.off(null, null, this);
                inherited.destroy.call(this);
            },

            compare: function() {
                return this._compare.apply(arguments);
            },

            comparator: function() {
                return Functions.as_method(this, this._compare);
            },

            info: function() {
                return {
                    row_count: this.__row_count,
                    key_count: this._key_count(),
                    key_count_ic: this._key_count_ic()
                };
            },

            options: function() {
                return this._options;
            },

            iterate: function(key, direction, callback, context) {
                this._iterate(key, direction, callback, context);
            },

            itemIterate: function(key, direction, callback, context) {
                this.iterate(key, direction, function(iterKey, id) {
                    return callback.call(context, iterKey, this._store.get(id).value());
                }, this);
            },

            iterate_ic: function(key, direction, callback, context) {
                this._iterate_ic(key, direction, callback, context);
            },

            itemIterateIc: function(key, direction, callback, context) {
                this.iterate_ic(key, direction, function(iterKey, id) {
                    return callback.call(context, iterKey, this._store.get(id).value());
                }, this);
            },

            _iterate: function(key, direction, callback, context) {},

            _iterate_ic: function(key, direction, callback, context) {},

            _insert: function(id, key) {},

            _remove: function(id) {},

            _update: function(id, key) {},

            _key_count: function() {},

            _key_count_ic: function() {},

            key_count_left_ic: function(key) {},
            key_count_right_ic: function(key) {},
            key_count_distance_ic: function(leftKey, rightKey) {},
            key_count_left: function(key) {},
            key_count_right: function(key) {},
            key_count_distance: function(leftKey, rightKey) {}

        };
    });
});
Scoped.define("module:Stores.MemoryIndex", [
    "module:Stores.AbstractIndex",
    "base:Structures.TreeMap",
    "base:Objs",
    "base:Types"
], function(AbstractIndex, TreeMap, Objs, Types, scoped) {
    return AbstractIndex.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            _initialize: function() {
                if (this._options.exact)
                    this._exactMap = TreeMap.empty(this._compare);
                if (this._options.ignoreCase)
                    this._ignoreCaseMap = TreeMap.empty(this._compare);
                this._idToKey = {};
            },

            __insert: function(id, key, map) {
                var value = TreeMap.find(key, map);
                if (value)
                    value[id] = true;
                else
                    map = TreeMap.add(key, Objs.objectBy(id, true), map);
                return map;
            },

            _insert: function(id, key) {
                this._idToKey[id] = key;
                if (this._options.exact)
                    this._exactMap = this.__insert(id, key, this._exactMap);
                if (this._options.ignoreCase)
                    this._ignoreCaseMap = this.__insert(id, key, this._ignoreCaseMap);
            },

            __remove: function(key, map, id) {
                var value = TreeMap.find(key, map);
                delete value[id];
                if (Types.is_empty(value))
                    map = TreeMap.remove(key, map);
                return map;
            },

            _remove: function(id) {
                var key = this._idToKey[id];
                delete this._idToKey[id];
                if (this._options.exact)
                    this._exactMap = this.__remove(key, this._exactMap, id);
                if (this._options.ignoreCase)
                    this._ignoreCaseMap = this.__remove(key, this._ignoreCaseMap, id);
            },

            _update: function(id, key) {
                var old_key = this._idToKey[id];
                if (old_key == key)
                    return;
                this._remove(id);
                this._insert(id, key);
            },

            _iterate: function(key, direction, callback, context) {
                TreeMap.iterate_from(key, this._exactMap, function(iterKey, value) {
                    for (var id in value) {
                        if (callback.call(context, iterKey, id) === false)
                            return false;
                    }
                    return true;
                }, this, !direction);
            },

            _iterate_ic: function(key, direction, callback, context) {
                TreeMap.iterate_from(key, this._ignoreCaseMap, function(iterKey, value) {
                    for (var id in value) {
                        if (callback.call(context, iterKey, id) === false)
                            return false;
                    }
                    return true;
                }, this, !direction);
            },

            _key_count: function() {
                return this._options.exact ? TreeMap.length(this._exactMap) : 0;
            },

            _key_count_ic: function() {
                return this._options.ignoreCase ? TreeMap.length(this._ignoreCaseMap) : 0;
            },

            key_count_left_ic: function(key) {
                return TreeMap.treeSizeLeft(key, this._ignoreCaseMap);
            },

            key_count_right_ic: function(key) {
                return TreeMap.treeSizeRight(key, this._ignoreCaseMap);
            },

            key_count_distance_ic: function(leftKey, rightKey) {
                return TreeMap.distance(leftKey, rightKey, this._ignoreCaseMap);
            },

            key_count_left: function(key) {
                return TreeMap.treeSizeLeft(key, this._exactMap);
            },

            key_count_right: function(key) {
                return TreeMap.treeSizeRight(key, this._exactMap);
            },

            key_count_distance: function(leftKey, rightKey) {
                return TreeMap.distance(leftKey, rightKey, this._exactMap);
            }

        };
    });
});
Scoped.define("module:Queries.Constrained", [
    "module:Queries",
    "base:Types",
    "base:Objs",
    "base:Tokens",
    "base:Comparators"
], function(Queries, Types, Objs, Tokens, Comparators) {
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

        rectify: function(constrainedQuery) {
            var base = ("options" in constrainedQuery || "query" in constrainedQuery) ? constrainedQuery : {
                query: constrainedQuery
            };
            return Objs.extend({
                query: {},
                options: {}
            }, base);
        },

        skipValidate: function(options, capabilities) {
            if ("skip" in options) {
                if (capabilities)
                    return capabilities.skip;
            }
            return true;
        },

        limitValidate: function(options, capabilities) {
            if ("limit" in options) {
                if (capabilities)
                    return capabilities.limit;
            }
            return true;
        },

        sortValidate: function(options, capabilities) {
            if ("sort" in options) {
                if (capabilities && !capabilities.sort)
                    return false;
                if (capabilities && Types.is_object(capabilities.sort)) {
                    var supported = Objs.all(options.sort, function(dummy, key) {
                        return key in capabilities.sort;
                    });
                    if (!supported)
                        return false;
                }
            }
            return true;
        },

        constraintsValidate: function(options, capabilities) {
            return Objs.all(["skip", "limit", "sort"], function(prop) {
                return this[prop + "Validate"].call(this, options, capabilities);
            }, this);
        },

        validate: function(constrainedQuery, capabilities) {
            constrainedQuery = this.rectify(constrainedQuery);
            return this.constraintsValidate(constrainedQuery.options, capabilities) && Queries.validate(constrainedQuery.query, capabilities.query || {});
        },

        fullConstrainedQueryCapabilities: function(queryCapabilties) {
            return {
                query: queryCapabilties || Queries.fullQueryCapabilities(),
                skip: true,
                limit: true,
                sort: true // can also be false OR a non-empty object containing keys which can be ordered by
            };
        },

        normalize: function(constrainedQuery) {
            constrainedQuery = this.rectify(constrainedQuery);
            return {
                query: Queries.normalize(constrainedQuery.query),
                options: constrainedQuery.options
            };
        },

        serialize: function(constrainedQuery) {
            return JSON.stringify(this.rectify(constrainedQuery));
        },

        unserialize: function(constrainedQuery) {
            return JSON.parse(constrainedQuery);
        },

        hash: function(constrainedQuery) {
            return Tokens.simple_hash(this.serialize(constrainedQuery));
        },

        subsumizes: function(constrainedQuery, constrainedQuery2) {
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

        mergeable: function(constrainedQuery, constrainedQuery2) {
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

        merge: function(constrainedQuery, constrainedQuery2) {
            constrainedQuery = this.rectify(constrainedQuery);
            constrainedQuery2 = this.rectify(constrainedQuery2);
            var qopts = constrainedQuery.options;
            var qopts2 = constrainedQuery2.options;
            return {
                query: constrainedQuery.query,
                options: {
                    skip: "skip" in qopts ? ("skip" in qopts2 ? Math.min(qopts.skip, qopts2.skip) : null) : null,
                    limit: "limit" in qopts ? ("limit" in qopts2 ? Math.max(qopts.limit, qopts2.limit) : null) : null,
                    sort: constrainedQuery.sort
                }
            };
        }


    };
});
Scoped.define("module:Queries", [
    "base:Types",
    "base:Sort",
    "base:Objs",
    "base:Class",
    "base:Tokens",
    "base:Iterators.ArrayIterator",
    "base:Iterators.FilteredIterator",
    "base:Strings",
    "base:Comparators"
], function(Types, Sort, Objs, Class, Tokens, ArrayIterator, FilteredIterator, Strings, Comparators) {

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
            evaluate_single: function(object_value, condition_value) {
                return object_value === condition_value;
            }
        },
        "$gt": {
            target: "atom",
            evaluate_single: function(object_value, condition_value) {
                return object_value > condition_value;
            }
        },
        "$lt": {
            target: "atom",
            evaluate_single: function(object_value, condition_value) {
                return object_value < condition_value;
            }
        },
        "$gte": {
            target: "atom",
            evaluate_single: function(object_value, condition_value) {
                return object_value >= condition_value;
            }
        },
        "$lte": {
            target: "atom",
            evaluate_single: function(object_value, condition_value) {
                return object_value <= condition_value;
            }
        },
        "$sw": {
            target: "atom",
            evaluate_single: function(object_value, condition_value) {
                return object_value === condition_value || (Types.is_string(object_value) && object_value.indexOf(condition_value) === 0);
            }
        },
        "$ct": {
            target: "atom",
            no_index_support: true,
            evaluate_single: function(object_value, condition_value) {
                return object_value === condition_value || (Types.is_string(object_value) && object_value.indexOf(condition_value) >= 0);
            }
        },
        "$eq": {
            target: "atom",
            evaluate_single: function(object_value, condition_value) {
                return object_value === condition_value;
            }
        },
        "$elemMatch": {
            target: "queries",
            no_index_support: true,
            evaluate_combine: Objs.exists
        }
    };

    Objs.iter(Objs.clone(SYNTAX_CONDITION_KEYS, 1), function(value, key) {
        var valueic = Objs.clone(value, 1);
        valueic.evaluate_single = function(object_value, condition_value) {
            return value.evaluate_single(Types.is_string(object_value) ? object_value.toLowerCase() : object_value, Types.is_string(condition_value) ? condition_value.toLowerCase() : condition_value);
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
         * condition :== $in: atoms | $gt: atom | $lt: atom | $gte: atom | $lte: atom | $sw: atom | $ct: atom | all with ic
         *
         */

        SYNTAX_PAIR_KEYS: SYNTAX_PAIR_KEYS,

        SYNTAX_CONDITION_KEYS: SYNTAX_CONDITION_KEYS,

        validate: function(query, capabilities) {
            return this.validate_query(query, capabilities);
        },

        validate_atoms: function(atoms, capabilities) {
            return Types.is_array(atoms) && Objs.all(atoms, function(atom) {
                return this.validate_atom(atom, capabilities);
            }, this);
        },

        validate_atom: function(atom, capabilities) {
            return !capabilities || !!capabilities.atom;
        },

        validate_queries: function(queries, capabilities) {
            return Types.is_array(queries) && Objs.all(queries, function(query) {
                return this.validate_query(query, capabilities);
            }, this);
        },

        validate_query: function(query, capabilities) {
            return Types.is_object(query) && Objs.all(query, function(value, key) {
                return this.validate_pair(value, key, capabilities);
            }, this);
        },

        validate_pair: function(value, key, capabilities) {
            if (key in this.SYNTAX_PAIR_KEYS) {
                if (capabilities && (!capabilities.bool || !(key in capabilities.bool)))
                    return false;
                return this.validate_queries(value, capabilities);
            }
            return this.validate_value(value, capabilities);
        },

        is_query_atom: function(value) {
            return value === null || !Types.is_object(value) || value.toString() !== "[object Object]" || Objs.all(value, function(v, key) {
                return !(key in this.SYNTAX_CONDITION_KEYS);
            }, this);
        },

        validate_value: function(value, capabilities) {
            return !this.is_query_atom(value) ? this.validate_conditions(value, capabilities) : this.validate_atom(value, capabilities);
        },

        validate_conditions: function(conditions, capabilities) {
            return Types.is_object(conditions) && Objs.all(conditions, function(value, key) {
                return this.validate_condition(value, key, capabilities);
            }, this);
        },

        validate_condition: function(value, key, capabilities) {
            if (capabilities && (!capabilities.conditions || !(key in capabilities.conditions)))
                return false;
            var meta = this.SYNTAX_CONDITION_KEYS[key];
            if (!meta)
                return false;
            if (meta.target === "atoms")
                return this.validate_atoms(value);
            else if (meta.target === "atom")
                return this.validate_atom(value);
            else if (meta.target === "queries")
                return this.validate_queries(value);
            return false;
        },

        normalize: function(query) {
            return Sort.deep_sort(query);
        },

        serialize: function(query) {
            return JSON.stringify(query);
        },

        unserialize: function(query) {
            return JSON.parse(query);
        },

        hash: function(query) {
            return Tokens.simple_hash(this.serialize(query));
        },

        dependencies: function(query) {
            return Object.keys(this.dependencies_query(query, {}));
        },

        dependencies_queries: function(queries, dep) {
            Objs.iter(queries, function(query) {
                dep = this.dependencies_query(query, dep);
            }, this);
            return dep;
        },

        dependencies_query: function(query, dep) {
            Objs.iter(query, function(value, key) {
                dep = this.dependencies_pair(value, key, dep);
            }, this);
            return dep;
        },

        dependencies_pair: function(value, key, dep) {
            return key in this.SYNTAX_PAIR_KEYS ? this.dependencies_queries(value, dep) : this.dependencies_key(key, dep);
        },

        dependencies_key: function(key, dep) {
            dep[key] = (dep[key] || 0) + 1;
            return dep;
        },

        evaluate: function(query, object) {
            return this.evaluate_query(query, object);
        },

        evaluate_query: function(query, object) {
            return Objs.all(query, function(value, key) {
                return this.evaluate_pair(value, key, object);
            }, this);
        },

        evaluate_pair: function(value, key, object) {
            if (key in this.SYNTAX_PAIR_KEYS) {
                return this.SYNTAX_PAIR_KEYS[key].evaluate_combine.call(Objs, value, function(query) {
                    return this.evaluate_query(query, object);
                }, this);
            } else
                return this.evaluate_value(value, object[key]);
        },

        evaluate_value: function(value, object_value) {
            return !this.is_query_atom(value) ? this.evaluate_conditions(value, object_value) : this.evaluate_atom(value, object_value);
        },

        evaluate_atom: function(value, object_value) {
            return value === object_value;
        },

        evaluate_conditions: function(value, object_value) {
            return Objs.all(value, function(condition_value, condition_key) {
                return this.evaluate_condition(condition_value, condition_key, object_value);
            }, this);
        },

        evaluate_condition: function(condition_value, condition_key, object_value) {
            var rec = this.SYNTAX_CONDITION_KEYS[condition_key];
            if (rec.target === "atoms") {
                return rec.evaluate_combine.call(Objs, condition_value, function(condition_single_value) {
                    return rec.evaluate_single.call(this, object_value, condition_single_value);
                }, this);
            } else if (rec.target === "atom")
                return rec.evaluate_single.call(this, object_value, condition_value);
            else if (rec.target === "queries") {
                return rec.evaluate_combine.call(Objs, object_value, function(object_single_value) {
                    return this.evaluate_query({
                        value: condition_value
                    }, {
                        value: object_single_value
                    });
                }, this);
            }
        },

        rangeSuperQueryDiffQuery: function(superCandidate, subCandidate) {
            if (!Objs.keyEquals(superCandidate, subCandidate))
                return false;
            var rangeKey = Objs.objectify(["$gt", "$lt", "$gte", "$lte"]);
            var ors = [];
            var result = {};
            var iterResult = Objs.iter(superCandidate, function(superValue, key) {
                superValue = Objs.clone(superValue, 1);
                var subValue = Objs.clone(subCandidate[key], 1);
                Objs.iter(rangeKey, function(dummy, k) {
                    if (superValue[k] && subValue[k] && superValue[k] === subValue[k]) {
                        delete superValue[k];
                        delete subValue[k];
                    }
                });
                if (Comparators.deepEqual(superValue, subValue, -1)) {
                    result[key] = superValue;
                    return true;
                }
                var splitSuper = Objs.filter(superValue, function(dummy, key) {
                    return !rangeKey[key];
                });
                var splitSub = Objs.filter(subValue, function(dummy, key) {
                    return !rangeKey[key];
                });
                if (!Comparators.deepEqual(splitSuper, splitSub, -1))
                    return false;
                var ret = Objs.clone(superValue, 1);
                if (subValue.$gt || subValue.$gte) {
                    if (subValue.$lt || subValue.$lte) {
                        if (superValue.$gt || superValue.$gte) {
                            if ((superValue.$gt || superValue.$gte) > (subValue.$gt || subValue.$gte))
                                return false;
                        }
                        if (superValue.$lt || superValue.$lte) {
                            if ((superValue.$lt || superValue.$lte) < (subValue.$lt || subValue.$lte))
                                return false;
                        }
                        var retLow = Objs.clone(ret, 1);
                        var retHigh = Objs.clone(ret, 1);
                        delete retLow.$lt;
                        delete retLow.$lte;
                        retLow[subValue.$gt ? "$lte" : "$lt"] = subValue.$gt || subValue.$gte;
                        delete retHigh.$gt;
                        delete retHigh.$gte;
                        retHigh[subValue.$lt ? "$gte" : "$gt"] = subValue.$lt || subValue.$lte;
                        ors.push(Objs.objectBy(key, retLow));
                        ors.push(Objs.objectBy(key, retHigh));
                        return true;
                    } else {
                        if (superValue.$lt || superValue.$lte)
                            return false;
                        if (superValue.$gt || superValue.$gte) {
                            if ((superValue.$gt || superValue.$gte) > (subValue.$gt || subValue.$gte))
                                return false;
                        }
                        ret[subValue.$gt ? "$lte" : "$lt"] = subValue.$gt || subValue.$gte;
                    }
                } else if (subValue.$lt || subValue.$lte) {
                    if (superValue.$gt || superValue.$gte)
                        return false;
                    if (superValue.$lt || superValue.$lte) {
                        if ((superValue.$lt || superValue.$lte) < (subValue.$lt || subValue.$lte))
                            return false;
                    }
                    ret[subValue.$lt ? "$gte" : "$gt"] = subValue.$lt || subValue.$lte;
                } else
                    return false;
                result[key] = ret;
            });
            if (!iterResult)
                return false;
            if (ors.length > 0)
                result.$or = result.$or ? result.$or.concat(ors) : ors;
            return result;
        },

        subsumizes: function(query, query2) {
            // This is very simple at this point
            if (!Types.is_object(query) || !Types.is_object)
                return query == query2;
            for (var key in query) {
                if (!(key in query2) || !this.subsumizes(query[key], query2[key]))
                    return false;
            }
            return true;
        },

        fullQueryCapabilities: function() {
            var bool = {};
            Objs.iter(this.SYNTAX_PAIR_KEYS, function(dummy, key) {
                bool[key] = true;
            });
            var conditions = {};
            Objs.iter(this.SYNTAX_CONDITION_KEYS, function(dummy, key) {
                conditions[key] = true;
            });
            return {
                atom: true,
                bool: bool,
                conditions: conditions
            };
        },

        mergeConditions: function(conditions1, conditions2) {
            if (!Types.is_object(conditions1))
                conditions1 = {
                    "$eq": conditions1
                };
            if (!Types.is_object(conditions2))
                conditions2 = {
                    "$eq": conditions2
                };
            var fail = false;
            var obj = Objs.clone(conditions1, 1);
            Objs.iter(conditions2, function(target, condition) {
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
                        Objs.iter(target, function(x) {
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
                obj = {
                    "$in": []
                };
            return obj;
        },

        disjunctiveNormalForm: function(query, mergeKeys) {
            query = Objs.clone(query, 1);
            var factors = [];
            if (query.$or) {
                var factor = [];
                Objs.iter(query.$or, function(q) {
                    Objs.iter(this.disjunctiveNormalForm(q, mergeKeys).$or, function(q2) {
                        factor.push(q2);
                    }, this);
                }, this);
                factors.push(factor);
                delete query.$or;
            }
            if (query.$and) {
                Objs.iter(query.$and, function(q) {
                    var factor = [];
                    Objs.iter(this.disjunctiveNormalForm(q, mergeKeys).$or, function(q2) {
                        factor.push(q2);
                    }, this);
                    factors.push(factor);
                }, this);
                delete query.$and;
            }
            var result = [];
            var helper = function(base, i) {
                if (i < factors.length) {
                    Objs.iter(factors[i], function(factor) {
                        var target = Objs.clone(base, 1);
                        Objs.iter(factor, function(value, key) {
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
            return {
                "$or": result
            };
        },

        simplifyQuery: function(query) {
            var result = {};
            Objs.iter(query, function(value, key) {
                if (key in this.SYNTAX_PAIR_KEYS) {
                    var arr = [];
                    var had_true = false;
                    Objs.iter(value, function(q) {
                        var qs = this.simplifyQuery(q);
                        if (Types.is_empty(qs))
                            had_true = true;
                        else
                            arr.push(qs);
                    }, this);
                    if ((key === "$and" && arr.length > 0) || (key === "$or" && !had_true))
                        result[key] = arr;
                } else if (Types.is_object(value)) {
                    var conds = this.simplifyConditions(value);
                    if (!Types.is_empty(conds))
                        result[key] = conds;
                } else
                    result[key] = value;
            }, this);
            return result;
        },

        simplifiedDNF: function(query, mergeKeys) {
            query = this.simplifyQuery(this.disjunctiveNormalForm(query, true));
            return !Types.is_empty(query) ? query : {
                "$or": [{}]
            };
        },

        simplifyConditions: function(conditions) {
            var result = {};
            Objs.iter(["", "ic"], function(add) {
                if (conditions["$eq" + add] || conditions["$in" + add]) {
                    var filtered = Objs.filter(conditions["$eq" + add] ? [conditions["$eq" + add]] : conditions["$in" + add], function(inkey) {
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
        },

        mapKeyValue: function(query, callback, context) {
            return this.mapKeyValueQuery(query, callback, context);
        },

        mapKeyValueQuery: function(query, callback, context) {
            var result = {};
            Objs.iter(query, function(value, key) {
                result = Objs.extend(result, this.mapKeyValuePair(value, key, callback, context));
            }, this);
            return result;
        },

        mapKeyValueQueries: function(queries, callback, context) {
            return Objs.map(queries, function(query) {
                return this.mapKeyValueQuery(query, callback, context);
            }, this);
        },

        mapKeyValuePair: function(value, key, callback, context) {
            if (key in this.SYNTAX_PAIR_KEYS)
                return Objs.objectBy(key, this.mapKeyValueQueries(value, callback, context));
            if (this.is_query_atom(value))
                return callback.call(context, key, value);
            var result = {};
            Objs.iter(value, function(condition_value, condition_key) {
                result[condition_key] = this.mapKeyValueCondition(condition_value, key, callback, context);
            }, this);
            return Objs.objectBy(key, result);
        },

        mapKeyValueCondition: function(condition_value, key, callback, context) {
            var is_array = Types.is_array(condition_value);
            if (!is_array)
                condition_value = [condition_value];
            var result = Objs.map(condition_value, function(value) {
                return Objs.peek(callback.call(context, key, value));
            }, this);
            return is_array ? result : result[0];
        },

        queryDeterminedByAttrs: function(query, attributes) {
            return Objs.exists(query, function(value, key) {
                if (key === "$and") {
                    return Objs.exists(value, function(q) {
                        return this.queryDeterminedByAttrs(q, attributes);
                    }, this);
                } else if (key === "$or") {
                    return Objs.all(value, function(q) {
                        return this.queryDeterminedByAttrs(q, attributes);
                    }, this);
                } else
                    return attributes[key];
            }, this);
        }

    };
});
Scoped.extend("module:Queries.AbstractQueryBuilder", [
    "base:Class",
    "base:Comparators",
    "base:Events.EventsMixin",
    "base:Objs"
], function(Class, Comparators, EventsMixin, Objs, scoped) {
    return Class.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {
        return {

            constructor: function() {
                inherited.constructor.call(this);
                this.__query = {};
            },

            _queryChanged: function() {
                var newQuery = this._buildQuery();
                if (!Comparators.deepEqual(this.__query, newQuery)) {
                    this.__query = newQuery;
                    this.trigger("change");
                }
            },

            getQuery: function() {
                return Objs.clone(this.__query, 1);
            },

            _buildQuery: function() {
                throw "Not implemented";
            }

        };
    }]);
});



Scoped.extend("module:Queries.SimpleQueryBuilder", [
    "module:Queries.AbstractQueryBuilder"
], function(AbstractQueryBuilder, scoped) {
    return AbstractQueryBuilder.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(query, queryMap, queryCtx) {
                inherited.constructor.call(this);
                this.__queryMap = queryMap;
                this.__queryCtx = queryCtx;
                this.__userQuery = null;
                this.setQuery(query);
            },

            setQuery: function(query) {
                this.__userQuery = query ? (this.__queryMap ? this.__queryMap.call(this.__queryCtx || this, query) : query) : {};
                this._queryChanged();
            },

            _buildQuery: function() {
                return this.__userQuery;
            }

        };
    });
});


Scoped.extend("module:Queries.AndQueryBuilder", [
    "module:Queries.AbstractQueryBuilder",
    "base:Objs",
    "base:Types"
], function(AbstractQueryBuilder, Objs, Types, scoped) {
    return AbstractQueryBuilder.extend({
        scoped: scoped
    }, function(inherited) {

        return {

            constructor: function() {
                inherited.constructor.call(this);
                this.__queries = {};
            },

            destroy: function() {
                Objs.iter(this.__queries, this.removeQuery, this);
                inherited.destroy.call(this);
            },

            addQuery: function(query) {
                this.__queries[query.cid()] = query;
                query.on("change", this._queryChanged, this);
                this._queryChanged();
                return query;
            },

            removeQuery: function(query) {
                delete this.__queries[query.cid()];
                query.off(null, null, this);
                this._queryChanged();
                return query;
            },

            _buildQuery: function() {
                var arr = Objs.values(this.__queries).map(function(query) {
                    return query.getQuery();
                }).filter(function(query) {
                    return !Types.is_empty(query);
                });
                switch (arr.length) {
                    case 0:
                        return {};
                    case 1:
                        return arr[0];
                    default:
                        return {
                            "$and": arr
                        };
                }
            }

        };

    });
});



Scoped.extend("module:Queries.ConstrainedQueryBuilder", [
    "base:Class",
    "base:Comparators",
    "base:Events.EventsMixin"
], function(Class, Comparators, EventsMixin, scoped) {
    return Class.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {
        return {

            constructor: function(queryBuilder, options) {
                inherited.constructor.call(this);
                this.__queryBuilder = queryBuilder;
                this.__options = options || {};
                this.__queryBuilder.on("change", function() {
                    this.trigger("change");
                }, this);
            },

            destroy: function() {
                this.__queryBuilder.off(null, null, this);
                inherited.destroy.call(this);
            },

            getOptions: function() {
                return this.__options;
            },

            setOptions: function(options) {
                options = options || {};
                if (Comparators.deepEqual(options, this.__options))
                    return;
                this.__options = options;
                this.trigger("change");
            },

            getQuery: function() {
                return this.getQueryBuilder().getQuery();
            },

            getQueryBuilder: function() {
                return this.__queryBuilder;
            },

            getConstrainedQuery: function() {
                return {
                    query: this.getQuery(),
                    options: this.getOptions()
                };
            }

        };
    }]);
});


Scoped.extend("module:Queries.RangeQueryBuilder", [
    "module:Queries.AbstractQueryBuilder",
    "base:Objs"
], function(AbstractQueryBuilder, Objs, scoped) {
    return AbstractQueryBuilder.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(key, lowerBound, upperBound) {
                inherited.constructor.call(this);
                this.__key = key;
                this.__lowerBound = lowerBound;
                this.__upperBound = upperBound;
                this._queryChanged();
            },

            _buildQuery: function() {
                return Objs.objectBy(this.__key, {
                    "$gte": this.__lowerBound,
                    "$lte": this.__upperBound
                });
            },

            touch: function(lowerBound, upperBound) {
                upperBound = upperBound || lowerBound;
                var changed = false;
                if (lowerBound < this.__lowerBound) {
                    changed = true;
                    this.__lowerBound = lowerBound;
                }
                if (upperBound > this.__upperBound) {
                    changed = true;
                    this.__upperBound = upperBound;
                }
                if (changed)
                    this._queryChanged();
            },

            setLowerBound: function(lowerBound) {
                this.__lowerBound = lowerBound;
                this._queryChanged();
            },

            setUpperBound: function(upperBound) {
                this.__upperBound = upperBound;
                this._queryChanged();
            }

        };
    });
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
], function(Queries, Constrained, Strings, Types, Objs, Promise, Comparators, SkipIterator, LimitIterator, SortedIterator, FilteredIterator, SortedOrIterator, PartiallySortedIterator, ArrayIterator, LazyMultiArrayIterator) {
    return {

        indexQueryConditionsSize: function(conds, index, ignoreCase) {
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

        indexQuerySize: function(queryDNF, key, index) {
            var acc = 0;
            var info = index.info();
            Objs.iter(queryDNF.$or, function(q) {
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

        queryPartially: function(constrainedQuery, constrainedQueryCapabilities) {
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

        compileQuery: function(constrainedQuery, constrainedQueryCapabilities, constrainedQueryFunction, constrainedQueryContext) {
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
            return query_result.mapSuccess(function(iter) {
                iter = this._queryResultRectify(iter, false);
                if (post_actions.filter) {
                    iter = (new FilteredIterator(iter, function(row) {
                        return Queries.evaluate(post_actions.filter, row);
                    })).auto_destroy(iter, true);
                }
                if (post_actions.sort)
                    iter = (new SortedIterator(iter, Comparators.byObject(post_actions.sort))).auto_destroy(iter, true);
                if (post_actions.skip)
                    iter = (new SkipIterator(iter, post_actions.skip)).auto_destroy(iter, true);
                if (post_actions.limit)
                    iter = (new LimitIterator(iter, post_actions.limit)).auto_destroy(iter, true);
                return iter;
            }, this);
        },

        compileIndexQuery: function(constrainedDNFQuery, key, index) {
            var fullQuery = Objs.exists(constrainedDNFQuery.query.$or, function(query) {
                return !(key in query);
            });
            var primaryKeySort = constrainedDNFQuery.options.sort && Objs.ithKey(constrainedDNFQuery.options.sort, 0) === key;
            var primarySortDirection = primaryKeySort ? constrainedDNFQuery.options.sort[key] : 1;
            var iter;
            var ignoreCase = !index.options().exact;
            if (fullQuery) {
                var materialized = [];
                index["itemIterate" + (ignoreCase ? "_ic" : "")](null, primarySortDirection, function(dataKey, data) {
                    materialized.push(data);
                });
                iter = new ArrayIterator(materialized);
            } else {
                iter = new SortedOrIterator(Objs.map(constrainedDNFQuery.query.$or, function(query) {
                    var iter;
                    var conds = query[key];
                    if (!primaryKeySort && index.options().ignoreCase && index.options().exact) {
                        if (this.indexQueryConditionsSize(conds, index, true) < this.indexQueryConditionsSize(conds, index, false))
                            ignoreCase = true;
                    }
                    var add = ignoreCase ? "ic" : "";
                    var postfix = ignoreCase ? "_ic" : "";
                    if (conds["$eq" + add] || !Types.is_object(conds)) {
                        var materialized = [];
                        var value = Types.is_object(conds) ? conds["$eq" + add] : conds;
                        index["itemIterate" + postfix](value, primarySortDirection, function(dataKey, data) {
                            if (dataKey !== value)
                                return false;
                            materialized.push(data);
                        });
                        iter = new ArrayIterator(materialized);
                    } else if (conds["$in" + add]) {
                        var i = 0;
                        iter = new LazyMultiArrayIterator(function() {
                            if (i >= conds["$in" + add].length)
                                return null;
                            var materialized = [];
                            index["itemIterate" + postfix](conds["$in" + add][i], primarySortDirection, function(dataKey, data) {
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
                        iter = new LazyMultiArrayIterator(function() {
                            if (currentKey !== null && lastKey !== null) {
                                if (Math.sign((index.comparator())(currentKey, lastKey)) === Math.sign(primarySortDirection))
                                    return null;
                            }
                            var materialized = [];
                            index["itemIterate" + postfix](currentKey, primarySortDirection, function(dataKey, data) {
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
            iter = (new FilteredIterator(iter, function(row) {
                return Queries.evaluate(constrainedDNFQuery.query, row);
            })).auto_destroy(iter, true);
            if (constrainedDNFQuery.options.sort) {
                if (primaryKeySort)
                    iter = (new PartiallySortedIterator(iter, Comparators.byObject(constrainedDNFQuery.options.sort), function(first, next) {
                        return first[key] === next[key];
                    })).auto_destroy(iter, true);
                else
                    iter = (new SortedIterator(iter, Comparators.byObject(constrainedDNFQuery.options.sort))).auto_destroy(iter, true);
            }
            if (constrainedDNFQuery.options.skip)
                iter = (new SkipIterator(iter, constrainedDNFQuery.options.skip)).auto_destroy(iter, true);
            if (constrainedDNFQuery.options.limit)
                iter = (new LimitIterator(iter, constrainedDNFQuery.options.limit)).auto_destroy(iter, true);
            return Promise.value(iter);
        },

        compileIndexedQuery: function(constrainedQuery, constrainedQueryCapabilities, constrainedQueryFunction, constrainedQueryContext, indices) {
            constrainedQuery = Constrained.rectify(constrainedQuery);
            indices = indices || {};
            if (this.queryPartially(constrainedQuery, constrainedQueryCapabilities) || Types.is_empty(indices))
                return this.compileQuery(constrainedQuery, constrainedQueryCapabilities, constrainedQueryFunction, constrainedQueryContext);
            var dnf = Queries.simplifiedDNF(constrainedQuery.query, true);
            if (constrainedQuery.options.sort) {
                var first = Objs.ithKey(constrainedQuery.options.sort, 0);
                if (indices[first]) {
                    return this.compileIndexQuery({
                        query: dnf,
                        options: constrainedQuery.options
                    }, first, indices[first]);
                }
            }
            var smallestSize = null;
            var smallestKey = null;
            Objs.iter(indices, function(index, key) {
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

        _queryResultRectify: function(result, materialize) {
            result = result || [];
            if (Types.is_array(result) == materialize)
                return result;
            if (materialize)
                return result.asArray();
            return new ArrayIterator(result);
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

//Stores everything temporarily in the browser's memory using map

Scoped.define("module:Stores.MemoryMapStore", [
    "module:Stores.AssocStore",
    "base:Iterators.FilteredIterator",
    "base:Iterators.NativeMapIterator",
    "base:Objs"
], function (AssocStore, FilteredIterator, NativeMapIterator, Objs, scoped) {
	return AssocStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (options) {
				inherited.constructor.call(this, options);
				this.__map = new Map();
			},

			_read_key: function (key) {
				return this.__map.get(key + "");
			},

			_write_key: function (key, value) {
				this.__map.set(key + "", value);
			},

			_remove_key: function (key) {
				this.__map['delete'](key + "");
			},

			_iterate: function () {
				var nativeMapIter = new NativeMapIterator(this.__map);
				return (new FilteredIterator(nativeMapIter, function (item) {
					return !!item;
				})).auto_destroy(nativeMapIter, true);
			},
			
			_count: function (query) {
				return query ? inherited._count.call(this, query) : this.__map.size;
			}						

		};
	});
});

//Stores everything temporarily in the browser's memory

Scoped.define("module:Stores.MemoryStore", [
    "module:Stores.AssocStore",
    //"base:Iterators.ObjectValuesIterator",
    "base:Iterators.FilteredIterator",
    "base:Iterators.ArrayIterator",
    "base:Objs",
	"base:Promise"
], function (AssocStore, FilteredIterator, ArrayIterator, Objs, Promise, scoped) {
	return AssocStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (options) {
				inherited.constructor.call(this, options);
				// We reserve index 0.
				this.__dataByIndex = [null];
				this.__indexById = {};
				this.__count = 0;
			},

			_read_key: function (key) {
				var i = this.__indexById[key];
				return i ? this.__dataByIndex[i] : undefined;
			},

			_write_key: function (key, value) {
				var i = this.__indexById[key];
				if (!i) {
					i = this.__dataByIndex.length;
					this.__indexById[key] = i;
					this.__count++;
				}
				this.__dataByIndex[i] = value;
			},

			_remove_key: function (key) {
				var i = this.__indexById[key];
				if (i) {
					delete this.__indexById[key];
					delete this.__dataByIndex[i];
					this.__count--;
				}				
			},

			_iterate: function () {
				var arrIter = new ArrayIterator(this.__dataByIndex);
				return (new FilteredIterator(arrIter, function (item) {
					return !!item;
				})).auto_destroy(arrIter, true);
				//return new ObjectValuesIterator(this.__data);
			},
			
			_count: function (query) {
				return query ? inherited._count.call(this, query) : Promise.value(this.__count);
			}

		};
	});
});

Scoped.define("module:Stores.BaseStore", [
  "base:Class",
  "base:Events.EventsMixin",
  "module:Stores.ReadStoreMixin",
  "module:Stores.WriteStoreMixin",
  "base:Promise",
  "base:Objs",
  "module:Stores.MemoryIndex"
], function (Class, EventsMixin, ReadStoreMixin, WriteStoreMixin, Promise, Objs, MemoryIndex, scoped) {
	return Class.extend({scoped: scoped}, [EventsMixin, ReadStoreMixin, WriteStoreMixin, function (inherited) {			
		return {

			constructor: function (options) {
				inherited.constructor.call(this);
				this._initializeReadStore(options);
				this._initializeWriteStore(options);
			},

			_ensure_index: function (key) {
				if (!(key in this.indices))
					this.indices[key] = new MemoryIndex(this, key);
			},	

			ensure_index: function (key) {
				return this._ensure_index(key);
			},

			getBy: function (key, value, ctx) {
				if (key === this.id_key())
					return this.get(value, ctx);
				return this.query(Objs.objectBy(key, value), {limit: 1}).mapSuccess(function (iter) {
                    var result = iter.next();
					iter.destroy();
					return result;
				});
			},

			clear: function (ctx) {
				return this.query(null, null, ctx).mapSuccess(function (iter) {
					var promise = Promise.and();
					while (iter.hasNext()) {
						var obj = iter.next();
						promise = promise.and(this.remove(obj[this._id_key], ctx));
					}
					iter.destroy();
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
			this.indices = {};
			this._watcher = options.watcher || null;
			this._capabilities = options.capabilities || {};
		},
		
		watcher: function () {
			return this._watcher;
		},

		_get: function (id, ctx) {
			return Promise.create(null, new StoreException("unsupported: get"));
		},

		_query_capabilities: function () {
			return this._capabilities;
		},

		_query: function (query, options, ctx) {
			return Promise.create(null, new StoreException("unsupported: query"));
		},

		get: function (id, ctx) {
			return this._get(id, ctx);
		},
		
		count: function (query, ctx) {
			return this._count(query, ctx);
		},
		
		_count: function (query, ctx) {
			return this.query(query, {}, ctx).mapSuccess(function (iter) {
				return iter.asArray().length;
			});
		},

		query: function (query, options, ctx) {
			query = Objs.clone(query || {}, -1);
			options = Objs.clone(options, -1);
			if (options) {
				if (options.limit)
					options.limit = parseInt(options.limit, 10);
				if (options.skip)
					options.skip = parseInt(options.skip, 10);
			}
			return QueryEngine.compileIndexedQuery(
					{query: query, options: options || {}},
					this._query_capabilities(),
					function (constrainedQuery) {
						return this._query(constrainedQuery.query, constrainedQuery.options, ctx);
					},
					this,
					this.indices);
		},

		findBy: function (query, ctx) {
			return this.query(query, {
				limit: 1
			}, ctx).mapSuccess(function (result) {
				return result.next();
			});
		},
		
		serialize: function (ctx) {
			return this.query({}, {}, ctx).mapSuccess(function (iter) {
				return iter.asArray();
			});
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
	"base:Events.EventsMixin",
	"base:Objs",
	"base:Types",
	"module:Stores.MemoryStore"
], function (Class, EventsMixin, Objs, Types, MemoryStore, scoped) {
	return Class.extend({scoped: scoped}, [EventsMixin, function (inherited) {
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
				this.historyStore = historyStore || this.auto_destroy(new MemoryStore());
				this.sourceStore = sourceStore;
				this.commitId = 1;
				if (sourceStore) {
					sourceStore.on("insert", this.sourceInsert, this);
					sourceStore.on("remove", this.sourceRemove, this);
					sourceStore.on("update", this.sourceUpdate, this);
				}
			},

			lockCommits: function () {
				this.lockedCommits = this.commitId;
			},

			unlockCommits: function () {
				delete this.lockedCommits;
			},

			sourceInsert: function (data) {
				this.commitId++;
				this.historyStore.insert(Objs.extend({
					row: data,
					type: "insert",
					row_id: data[this._options.source_id_key],
					commit_id: this.commitId
				}, this._options.row_data));
				this.trigger("insert", this.commitId);
				return this.commitId;
			},

			sourceUpdate: function (row, data, dummy_ctx, pre_data) {
				this.commitId++;
				var row_id = Types.is_object(row) ? row[this._options.source_id_key] : row;
				var target_type = "update";
				if (this._options.combine_insert_update || this._options.combine_update_update) {
					var types = [];
					if (this._options.combine_insert_update)
						types.push({"type": "insert"});
					if (this._options.combine_update_update)
						types.push({"type": "update"});
					var combined_data = {};
					var delete_ids = [];
					var query = Objs.extend({ row_id: row_id }, this._options.filter_data);
					if (this.lockedCommits)
						query.commit_id = {"$gt": this.lockedCommits};
					if (types.length === 1)
						query.type = types[0];
					else
						query.$or = types;
					var iter = this.historyStore.query(query, {sort: {commit_id: 1}}).value();
					while (iter.hasNext()) {
						var itemData = iter.next();
						if (itemData.type === "insert")
							target_type = "insert";
						combined_data = Objs.extend(combined_data, itemData.row);
						delete_ids.push(this.historyStore.id_of(itemData));
					}
					iter.destroy();
					data = Objs.extend(combined_data, data);
					Objs.iter(delete_ids, this.historyStore.remove, this.historyStore);
				}
				this.historyStore.insert(Objs.extend({
					row: data,
					pre_data: pre_data,
					type: target_type,
					row_id: row_id,
					commit_id: this.commitId
				}, this._options.row_data));
                this.trigger("update", this.commitId);
                this.trigger("update:" + row_id, this.commitId);
                return this.commitId;
			},

			sourceRemove: function (id, data) {
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
						iter.destroy();
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
					iter2.destroy();
				}
				this.historyStore.insert(Objs.extend({
					type: "remove",
					row_id: id,
					row: data,
					commit_id: this.commitId
				}, this._options.row_data));
                this.trigger("remove", this.commitId);
                this.trigger("remove:" + id, this.commitId);
                return this.commitId;
			},

			getCommitById: function (commitId) {
				return this.historyStore.query({
					commit_id: commitId
				}, {
					limit: 1
				}).mapSuccess(function (commits) {
					var result = commits.next();
					commits.destroy();
					return result;
				});
			},

			undoCommit: function (commit) {
				if (commit.type === "insert") {
					return this.sourceStore.remove(commit.row_id);
                } else if (commit.type === "remove") {
					return this.sourceStore.insert(commit.row);
				} else if (commit.type === "update") {
					return this.sourceStore.update(commit.row_id, commit.pre_data || {});
				}
			},

			undoCommitById: function (commitId) {
				return this.getCommitById(commitId).mapSuccess(function (commit) {
					return this.undoCommit(commit).success(function () {
						this.historyStore.remove(this.historyStore.id_of(commit));
					}, this);
				}, this);
			}

		};
	}]);
});

Scoped.define("module:Stores.WriteStoreMixin", [
                                                "module:Stores.StoreException",
                                                "base:Promise",
                                                "base:IdGenerators.TimedIdGenerator",
                                                "base:Types"
                                                ], function (StoreException, Promise, TimedIdGenerator, Types) {
	return {

		_initializeWriteStore: function (options) {
			options = options || {};
			this._id_key = options.id_key || "id";
			this._create_ids = options.create_ids || false;
            this._validate_ids = options.validate_ids || false;
			this._id_lock = options.id_lock || false;
			this.preserve_preupdate_data = options.preserve_preupdate_data || false;
			if (this._create_ids)
				this._id_generator = options.id_generator || this._auto_destroy(new TimedIdGenerator());
			if (this._validate_ids)
				this._id_validator = options.id_validator || this._id_generator;
		},

		id_key: function () {
			return this._id_key;
		},

		id_of: function (row) {
			return row[this.id_key()];
		},
		
		id_row: function (id) {
			var result = {};
			result[this._id_key] = id;
			return result;
		},

		_inserted: function (row, ctx) {
			this.trigger("insert", row, ctx);		
			this.trigger("write", "insert", row, ctx);
		},

		_removed: function (id, ctx, data) {
			this.trigger("remove", id, ctx, data);
			this.trigger("write", "remove", id, ctx, data);
		},

		_updated: function (row, data, ctx, pre_data) {
			this.trigger("update", row, data, ctx, pre_data);
			this.trigger("write", "update", row, data, ctx, pre_data);
		}, 

		insert_all: function (data, ctx) {
			var promise = Promise.and();
			(data || []).forEach(function (item) {
                promise = promise.and(this.insert(item, ctx));
			}, this);
			return promise.end();
		},

		_insert: function (data, ctx) {
			return Promise.create(null, new StoreException("unsupported: insert"));
		},

		_remove: function (id, ctx) {
			return Promise.create(null, new StoreException("unsupported: remove"));
		},

		_update: function (id, data, ctx) {
			return Promise.create(null, new StoreException("unsupported: update"));
		},

		insert: function (data, ctx) {
			if (!data)
				return Promise.create(null, new StoreException("empty insert"));
            if (this._id_key in data && data[this._id_key] && this._id_lock)
            	return Promise.create(null, new StoreException("id lock"));
			if (this._create_ids && !(this._id_key in data && data[this._id_key]))
				data[this._id_key] = this._id_generator.generate(ctx);
			if (this._id_validator && this._id_key in data && data[this._id_key]) {
				if (!this._id_validator.valid(data[this._id_key], ctx))
	                return Promise.create(null, new StoreException("invalid id"));
			}
			return this._insert(data, ctx).success(function (row) {
				this._inserted(row, ctx);
			}, this);
		},

		remove: function (id, ctx) {
			return this._remove(id, ctx).success(function (data) {
				this._removed(id, ctx, data);
			}, this);
		},

		update: function (id, data, ctx) {
			if (this.preserve_preupdate_data) {
                return this.get(id, ctx).mapSuccess(function (pre_data) {
                	var pre_data_filtered = {};
                	for (var key in data)
                        pre_data_filtered[key] = pre_data[key];
                	return this._update(id, data, ctx).success(function (row) {
                        this._updated(row, data, ctx, pre_data_filtered);
                    }, this);
                }, this);
			} else {
				return this._update(id, data, ctx).success(function (row) {
                    this._updated(row, data, ctx);
                }, this);
			}
		},
		
		unserialize: function (arr, ctx) {
			return this.insert_all(arr, ctx);
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


Scoped.define("module:Stores.AsyncStore", [
                                                 "module:Stores.BaseStore",
                                                 "base:Promise",
                                                 "base:Async"
                                                 ], function (BaseStore, Promise, Async, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (store, options) {
				this.__store = store;
				options = options || {};
				options.id_key = store.id_key();
				inherited.constructor.call(this, options);
				this.__time = options.time || 0;
				if (options.destroy_store)
					this._auto_destroy(store);
			},

			_query_capabilities: function () {
				return this.__store._query_capabilities();
			},
			
			__async: function (f, args) {
				var promise = Promise.create();
				Async.eventually(function () {
					f.apply(this.__store, args).forwardCallback(promise);
				}, this, this.__time);
				return promise;
			},

			_insert: function () {
				return this.__async(this.__store.insert, arguments);
			},

			_remove: function () {
				return this.__async(this.__store.remove, arguments);
			},

			_get: function () {
				return this.__async(this.__store.get, arguments);
			},

			_update: function () {
				return this.__async(this.__store.update, arguments);
			},

			_query: function () {
				return this.__async(this.__store.query, arguments);
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



Scoped.define("module:Stores.ConcatStore", [
    "module:Stores.BaseStore"
], function (BaseStore, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (primary, secondary, options) {
				this.__primary = primary;
				this.__secondary = secondary;
				inherited.constructor.call(this, options);
			},

			_query_capabilities: function () {
				return this._primary()._query_capabilities();
			},

            _count: function () {
				return this._primary().count.apply(this._primary(), arguments).and(this._secondary().count.apply(this._secondary(), arguments)).mapSuccess(function (counts) {
					return counts[0] + counts[1];
				});
            },

			_insert: function () {
				var args = arguments;
				return this._primary().insert.apply(this._primary(), args).mapError(function () {
					return this._secondary().insert.apply(this._secondary(), args);
				}, this);
			},

			_remove: function () {
                var args = arguments;
                return this._primary().remove.apply(this._primary(), args).mapError(function () {
                    return this._secondary().remove.apply(this._secondary(), args);
                }, this);
			},

			_get: function () {
                var args = arguments;
                return this._primary().get.apply(this._primary(), args).mapCallback(function (error, model) {
                    return model || this._secondary().get.apply(this._secondary(), args);
                }, this);
			},

			_update: function () {
                var args = arguments;
                return this._primary().update.apply(this._primary(), args).mapError(function () {
                    return this._secondary().update.apply(this._secondary(), args);
                }, this);
			},

			_query: function (q, c, ctx) {
				c = c || {};
				return this._primary().query(q, c, ctx).mapSuccess(function (result) {
					result = result.asArray();
					if (c.limit && result.length >= c.limit)
						return result;
					if (c.limit)
						c.limit -= result.length;
					return this._secondary().query(q, c, ctx).mapSuccess(function (result2) {
						return result.concat(result2.asArray());
					}, this);
				}, this);
			},

			_primary: function () {
				return this.__primary;
			},

            _secondary: function () {
                return this.__secondary;
            }


		};
	});
});


Scoped.define("module:Stores.ContextualizedStore", [
	"module:Stores.BaseStore",
	"base:Iterators.MappedIterator"
], function (BaseStore, MappedIterator, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (store, options) {
				this.__store = store;
				options = options || {};
				options.id_key = store.id_key();
				this.__context = options.context || this;
				this.__decode = options.decode;
				this.__encode = options.encode;
				inherited.constructor.call(this, options);
				if (options.destroy_store)
					this._auto_destroy(store);
			},
			
			_decode: function (data) {
				return this.__decode.call(this.__context, data);
			},
			
			_encode: function (data, ctx) {
				return this.__encode.call(this.__context, data, ctx);
			},
			
			_decodeId: function (id) {
				var result = this._decode(this.id_row(id));
				return {
					id: this.id_of(result.data),
					ctx: result.ctx
				};
			},

			_query_capabilities: function () {
				return this.__store._query_capabilities();
			},

			_insert: function (data) {
				var decoded = this._decode(data);
				return this.__store.insert(decoded.data, decoded.ctx).mapSuccess(function (data) {
					return this._encode(data, decoded.ctx);
				}, this);
			},

			_remove: function (id) {
				var decoded = this._decodeId(id);
				return this.__store.remove(decoded.id, decoded.ctx).mapSuccess(function () {
					return id;
				}, this);
			},

			_get: function (id) {
				var decoded = this._decodeId(id);
				return this.__store.get(decoded.id, decoded.ctx).mapSuccess(function (data) {
					return this._encode(data, decoded.ctx);
				}, this);
			},

			_update: function (id, data) {
				var decoded = this._decodeId(id);
				this.__store.update(decoded.id, data, decoded.ctx).mapSuccess(function (row) {
					return row;
				}, this);
			},

			_query: function (query, options) {
				var decoded = this._decode(query);
				return this.__store.query(decoded.data, options, decoded.ctx).mapSuccess(function (results) {
					return (new MappedIterator(results, function (row) {
						return this._encode(row, decoded.ctx);
					}, this)).auto_destroy(results, true);
				}, this);
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



Scoped.define("module:Stores.AbstractDecontextualizedStore", [
	"module:Stores.BaseStore",
	"base:Iterators.MappedIterator",
	"base:Promise"
], function (BaseStore, MappedIterator, Promise, scoped) {
   	return BaseStore.extend({scoped: scoped}, function (inherited) {			
   		return {

            constructor: function (store, options) {
                this.__store = store;
                options = options || {};
                options.id_key = store.id_key();
                inherited.constructor.call(this, options);
                if (options.destroy_store)
                    this._auto_destroy(store);
            },

            _query_capabilities: function () {
                return this.__store._query_capabilities();
            },

            _ensure_index: function (key) {
                return this.__store.ensure_index(key);
            },

            _store: function () {
                return this.__store;
            },

            _get: function (id, ctx) {
                return this._rawGet(id, ctx).mapSuccess(function (row) {
                    return this._decodeRow(row, ctx);
                }, this);
            },

			_rawQuery: function (query, options, ctx) {
                return this.__store.query(this._encodeQuery(query, ctx), options);
			},

			_rawGet: function (id, ctx) {
                return this._rawQuery(this.id_row(id), {limit: 1}, ctx).mapSuccess(function (rows) {
                    var result = rows.hasNext() ? rows.next() : null;
                    rows.destroy();
                    return result;
                }, this);
			},

            _query: function (query, options, ctx) {
                return this._rawQuery(query, options, ctx).mapSuccess(function (results) {
                    return (new MappedIterator(results, function (row) {
                        return this._decodeRow(row, ctx);
                    }, this)).auto_destroy(results, true);
                }, this);
            },

            _insert: function (data, ctx) {
                return Promise.value(this._encodeRow(data, ctx)).mapSuccess(function (encoded) {
                	return this.__store.insert(encoded).mapSuccess(function (data) {
                	    this._undecodedInserted(data, ctx);
                        return this._decodeRow(data, ctx);
                    }, this);
                }, this);
            },

            _undecodedInserted: function (data, ctx) {},

            _remove: function (id, ctx) {
            	return this._rawGet(id, ctx).mapSuccess(function (row) {
					if (!row)
						return true;
					var updatedData = this._encodeRemove(id, row, ctx);
					if (updatedData)
						return this.__store.update(id, updatedData);
					else
						return this.__store.remove(id);
                }, this);
            },

            _update: function (id, data, ctx) {
            	return this._rawGet(id, ctx).mapSuccess(function (row) {
            		if (!row)
            			return true;
            		var updatedData = this._encodeUpdate(id, data, ctx, row);
            		return this.__store.update(id, updatedData).mapSuccess(function (updatedData) {
            		    this._undecodedUpdated(id, updatedData, ctx, row);
            		    return this._decodeRow(updatedData, ctx);
                    }, this);
				}, this);
            },

            _undecodedUpdated: function (id, updatedData, ctx) {},

            _encodeRow: function (data, ctx) {
				throw "Abstract";
			},

			_encodeQuery: function (query, ctx) {
            	throw "Abstract";
			},

            _decodeRow: function (data, ctx) {
                throw "Abstract";
            },

			_encodeRemove: function (id, data, ctx) {
            	throw "Abstract";
			},

			_encodeUpdate: function (id, data, ctx, row) {
            	throw "Abstract";
			},

            _inserted: function (data, ctx) {
                inherited._inserted.call(this, this._decodeRow(data, ctx), ctx);
            },

            _removed: function (id, ctx, data) {
                inherited._removed.call(this, id, ctx, this._decodeRow(data, ctx));
            },

            _updated: function (row, data, ctx, pre_data) {
                inherited._updated.call(this, this._decodeRow(row, ctx), this._decodeRow(data, ctx), ctx, this._decodeRow(pre_data, ctx));
            }

        };
    });
});



Scoped.define("module:Stores.DecontextualizedSelectStore", [
    "module:Stores.AbstractDecontextualizedStore",
    "base:Objs"
], function (AbstractDecontextualizedStore, Objs, scoped) {
    return AbstractDecontextualizedStore.extend({scoped: scoped}, function (inherited) {
        return {

            _encodeRow: function (data, ctx) {
                return Objs.extend(Objs.clone(data, 1), ctx);
            },

            _encodeQuery: function (query, ctx) {
                return Objs.extend(Objs.clone(query, 1), ctx);
            },

            _decodeRow: function (data, ctx) {
                if (!data)
                    return data;
                data = Objs.clone(data, 1);
                Objs.iter(ctx, function (value, key) {
                    delete data[key];
                });
                return data;
            },

            _encodeRemove: function (id, data, ctx) {
                return false;
            },

            _encodeUpdate: function (id, data, ctx, row) {
                return this._encodeRow(data, ctx);
            }

        };
    });
});

Scoped.define("module:Stores.DecontextualizedMultiAccessStore", [
    "module:Stores.AbstractDecontextualizedStore",
    "base:Objs",
	"base:Promise",
    "base:Types"
], function (AbstractDecontextualizedStore, Objs, Promise, Types, scoped) {
    return AbstractDecontextualizedStore.extend({scoped: scoped}, function (inherited) {
        return {

            constructor: function (store, options) {
                inherited.constructor.call(this, store, options);
                this.__contextKey = options.contextKey;
                this.__contextAttributes = options.contextAttributes || [];
                this.__contextAccessKey = options.contextAccessKey;
                this.__immediateRemove = options.immediateRemove;
                this.__contextAccessExpander = options.contextAccessExpander || function () {
                    return [];
                };
                this.__contextDataCloner = options.contextDataCloner || function (data) {
                    var result = {};
                    this.__contextAttributes.forEach(function (ctxAttrKey) {
                        result[ctxAttrKey] = data[ctxAttrKey];
                    }, this);
                    return result;
                };
                this.__contextDataUpdater = options.contextDataUpdater;
            },

            _encodeQuery: function (query, ctx) {
                query = Objs.extend(Objs.objectBy(
                	this.__contextAccessKey,
					{"$elemMatch": ctx[this.__contextKey]}
				), query);
                this.__contextAttributes.forEach(function (key) {
                    // TODO: This currently only works with MongoDB databases
                    if (key in query) {
                        query[key + "." + ctx[this.__contextKey]] = query[key];
                        delete query[key];
                        // TODO: This is a weird workaround, otherwise the result will be empty
                        delete query[this.__contextAccessKey];
                    }
                }, this);
                return query;
            },

            _encodeRemove: function (id, data, ctx) {
                var ctxId = ctx[this.__contextKey];
                if (this.__immediateRemove) {
                    (data[this.__contextAccessKey]).forEach(function (cctx) {
                        if (cctx !== ctxId)
                            inherited._removed.call(this, id, cctx, data);
                    }, this);
                    return false;
                }
                var filtered = data[this.__contextAccessKey].filter(function (contextValue) {
                	return contextValue !== ctxId;
				}, this);
                if (filtered.length === 0)
                	return false;
                var updatedData = Objs.objectBy(this.__contextAccessKey, filtered);
                this.__contextAttributes.forEach(function (ctxAttrKey) {
                	updatedData[ctxAttrKey] = Objs.clone(data[ctxAttrKey], 1);
                	delete updatedData[ctxAttrKey][ctxId];
				}, this);
                return updatedData;
            },

            _decodeRow: function (data, ctx) {
                if (!data)
                    return data;
                data = Objs.clone(data, 2);
                var ctxId = ctx[this.__contextKey];
                delete data[this.__contextAccessKey];
                this.__contextAttributes.forEach(function (ctxAttrKey) {
                    if (data[ctxAttrKey])
                        data[ctxAttrKey] = data[ctxAttrKey][ctxId];
                }, this);
                return data;
            },

            _encodeUpdate: function (id, data, ctx, row) {
                data = Objs.clone(data, 1);
                var ctxId = ctx[this.__contextKey];
                this.__contextAttributes.forEach(function (ctxAttrKey) {
                	if (ctxAttrKey in data) {
                        var value = data[ctxAttrKey];
                        data[ctxAttrKey] = row[ctxAttrKey];
                        data[ctxAttrKey][ctxId] = value;
                    }
                }, this);
                if (this.__contextDataUpdater)
                    data = this.__contextDataUpdater(id, data, ctx, row);
                return data;
            },

            _encodeRow: function (data, ctx) {
                var ctxId = ctx[this.__contextKey];
                data = Objs.clone(data, 1);
                var contextData = {};
                data[this.__contextAccessKey] = [ctxId];
                this.__contextAttributes.forEach(function (ctxAttrKey) {
                    contextData[ctxAttrKey] = data[ctxAttrKey];
                    data[ctxAttrKey] = Objs.objectBy(
                        ctxId,
                        contextData[ctxAttrKey]
                    );
                }, this);
                var otherContexts = Promise.value(this.__contextAccessExpander.call(this, data, ctx));
                return otherContexts.mapSuccess(function (otherContexts) {
                    otherContexts = otherContexts.filter(function (otherCtxId) {
                        return otherCtxId !== ctxId;
                    });
                    data[this.__contextAccessKey] = data[this.__contextAccessKey].concat(otherContexts);
                    var clonedDataPromises = otherContexts.map(function (otherCtxId) {
                        return Promise.value(this.__contextDataCloner.call(this, data, ctx, otherCtxId));
                    }, this);
                	return Promise.and(clonedDataPromises).mapSuccess(function (clonedDatas) {
                        otherContexts.forEach(function (otherCtxId, i) {
                            var otherData = clonedDatas[i];
                            this.__contextAttributes.forEach(function (ctxAttrKey) {
                                data[ctxAttrKey][otherCtxId] = otherData[ctxAttrKey];
                            }, this);
                        }, this);
                        return data;
					}, this);
				}, this);
            },

            _undecodedUpdated: function (id, updatedData, ctx, row) {
                (row[this.__contextAccessKey]).forEach(function (cctxId) {
                    if (ctx[this.__contextKey] == cctxId)
                        return;
                    var cctx = Objs.objectBy(this.__contextKey, cctxId);
                    this._updated(row, updatedData, cctx, row);
                }, this);
            },

            _undecodedInserted: function (data, ctx) {
                (data[this.__contextAccessKey]).forEach(function (cctxId) {
                    if (ctx[this.__contextKey] == cctxId)
                        return;
                    var cctx = Objs.objectBy(this.__contextKey, cctxId);
                    this._inserted(data, cctx);
                }, this);
            }

        };
    });
});


Scoped.define("module:Stores.KeyMapStore", ["module:Stores.TransformationStore", "base:Objs"], function (TransformationStore, Objs, scoped) {
	return TransformationStore.extend({scoped: scoped}, function (inherited) {			
		return {
			
			constructor: function (store, options, map) {
				inherited.constructor.call(this, store, options);
				this.__encodeMap = map;
				this.__decodeMap = Objs.inverseKeyValue(map);
			},
			
			__mapBy: function (data, map) {
				var result = {};
				Objs.iter(data, function (value, key) {
					result[map[key] || key] = value;
				});
				return result;
			},
			
			_encodeData: function (data) {
				return this.__mapBy(data, this.__encodeMap);
			},
			
			_decodeData: function (data) {
				return this.__mapBy(data, this.__decodeMap);
			}

		};
	});
});

Scoped.define("module:Stores.MultiplexerStore", [
                                                 "module:Stores.BaseStore",
                                                 "module:Queries.Constrained",
                                                 "base:Promise"
                                                 ], function (BaseStore, Constrained, Promise, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (options) {
				inherited.constructor.call(this, options);
				this.__context = options.context || this;
				this.__acquireStore = options.acquireStore;
				this.__releaseStore = options.releaseStore;
				this.__mapContext = options.mapContext;
			},
			
			_acquireStore: function (ctx) {
				return Promise.value(this.__acquireStore ? this.__acquireStore.call(this.__context, ctx) : ctx);
			},
			
			_releaseStore: function (ctx, store) {
				if (this.__releaseStore)
					this.__releaseStore.call(this.__context, ctx, store);
			},
			
			_mapContext: function (ctx) {
				return this.__mapContext ? this.__mapContext.call(this.__context, ctx) : null;
			},

			_query_capabilities: function () {
				return Constrained.fullConstrainedQueryCapabilities();
			},

			_insert: function (data, ctx) {
				return this._acquireStore(ctx).mapSuccess(function (store) {
					return store.insert(data, this._mapContext(ctx)).callback(function () {
						this._releaseStore(ctx, store);
					}, this);
				}, this);
			},
			
			_remove: function (id, ctx) {
				return this._acquireStore(ctx).mapSuccess(function (store) {
					return store.remove(id, this._mapContext(ctx)).callback(function () {
						this._releaseStore(ctx, store);
					}, this);
				}, this);
			},

			_update: function (id, data, ctx) {
				return this._acquireStore(ctx).mapSuccess(function (store) {
					return store.update(id, data, this._mapContext(ctx)).callback(function () {
						this._releaseStore(ctx, store);
					}, this);
				}, this);
			},

			_get: function (id, ctx) {
				return this._acquireStore(ctx).mapSuccess(function (store) {
					return store.get(id, this._mapContext(ctx)).callback(function () {
						this._releaseStore(ctx, store);
					}, this);
				}, this);
			},
			
			_query: function (query, options, ctx) {
				return this._acquireStore(ctx).mapSuccess(function (store) {
					return store.query(query, options, this._mapContext(ctx)).callback(function () {
						this._releaseStore(ctx, store);
					}, this);
				}, this);
			}

		};
	});
});


Scoped.define("module:Stores.PassthroughStore", [
                                                 "module:Stores.BaseStore",
                                                 "base:Promise"
                                                 ], function (BaseStore, Promise, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (store, options) {
				this.__store = store;
				options = options || {};
				options.id_key = options.id_key || store.id_key();
				this.__preserves = options.preserves;
				inherited.constructor.call(this, options);
				if (options.destroy_store)
					this._auto_destroy(store);
				this.delegateEvents(["insert", "update", "remove"], this.__store);
			},

			_query_capabilities: function () {
				return this.__store._query_capabilities();
			},

			_insert: function (originalData, ctx) {
				return this._preInsert(originalData).mapSuccess(function (data) {
					return this.__store.insert(data, ctx).mapSuccess(function (data) {
						var result = this._postInsert(data);
						if (this.__preserves) {
							return result.mapSuccess(function (data) {
								this.__preserves.forEach(function (preserve) {
									if (preserve in originalData && !(preserve in data))
										data[preserve] = originalData[preserve];
								});
								return data;
							}, this);
						} else
							return result;
					}, this);
				}, this);
			},

			_remove: function (id, ctx) {
				return this._preRemove(id).mapSuccess(function (id) {
					return this.__store.remove(id, ctx).mapSuccess(function () {
						return this._postRemove(id);
					}, this);
				}, this);
			},

			_get: function (id, ctx) {
				return this._preGet(id).mapSuccess(function (id) {
					return this.__store.get(id, ctx).mapSuccess(function (data) {
						return this._postGet(data);
					}, this);
				}, this);
			},

			_update: function (id, data, ctx) {
				return this._preUpdate(id, data).mapSuccess(function (args) {
					return this.__store.update(args.id, args.data, ctx).mapSuccess(function (row) {
						return this._postUpdate(row);
					}, this);
				}, this);
			},

			_query: function (query, options, ctx) {
				return this._preQuery(query, options).mapSuccess(function (args) {
					return this.__store.query(args.query, args.options, ctx).mapSuccess(function (results) {
						return this._postQuery(results);
					}, this);
				}, this);
			},

			unserialize: function (data) {
				return this._preUnserialize(data).mapSuccess(function (data) {
					return this.__store.unserialize(data).mapSuccess(function (data) {
						return this._postUnserialize(data);
					}, this);
				}, this);
			},

			serialize: function (data) {
				return this._preSerialize(data).mapSuccess(function (data) {
					return this.__store.serialize(data).mapSuccess(function (data) {
						return this._postSerialize(data);
					}, this);
				}, this);
			},

			_ensure_index: function (key) {
				return this.__store.ensure_index(key);
			},

			_store: function () {
				return this.__store;
			},

			_preInsert: function (data) {
				return Promise.value(data);
			},
			
			_postInsert: function (data) {
				return Promise.value(data);
			},
			
			_preRemove: function (id) {
				return Promise.value(id);
			},
			
			_postRemove: function (id) {
				return Promise.value(true);
			},
			
			_preGet: function (id) {
				return Promise.value(id);
			},
			
			_postGet: function (data) {
				return Promise.value(data);
			},

			_preUpdate: function (id, data) {
				return Promise.value({id: id, data: data});
			},
			
			_postUpdate: function (row) {
				return Promise.value(row);
			},
			
			_preQuery: function (query, options) {
				return Promise.value({query: query, options: options});
			},
			
			_postQuery: function (results) {
				return Promise.value(results);
			},
			
			_preSerialize: function (data) {
				return Promise.value(data);
			},
			
			_postSerialize: function (data) {
				return Promise.value(data);
			},
			
			_preUnserialize: function (data) {
				return Promise.value(data);
			},
			
			_postUnserialize: function (data) {
				return Promise.value(data);
			},
			
			watcher: function () {
				return this.__store.watcher();
			}

		};
	});
});


Scoped.define("module:Stores.ReadyStore", [
                                               "module:Stores.PassthroughStore",
                                               "base:Promise",
                                               "base:Objs"
                                               ], function (PassthroughStore, Promise, Objs, scoped) {
	return PassthroughStore.extend({scoped: scoped}, function (inherited) {			
		return {
			
			__ready: false,
			
			ready: function () {
				this.__ready = true;
				Objs.iter(this.__promises, function (rec) {
					rec.promise.forwardCallback(rec.stalling);
				});
				delete this.__promises;
			},
			
			__execute: function (promise) {
				if (this.__ready)
					return promise;
				var stalling = Promise.create();
				this.__promises = this.__promises || [];
				this.__promises.push({
					stalling: stalling,
					promise: promise
				});
				return stalling;
			},

			_preInsert: function () {
				return this.__execute(inherited._preInsert.apply(this, arguments));
			},
			
			_preRemove: function () {
				return this.__execute(inherited._preRemove.apply(this, arguments));
			},
			
			_preGet: function () {
				return this.__execute(inherited._preGet.apply(this, arguments));
			},
			
			_preUpdate: function () {
				return this.__execute(inherited._preUpdate.apply(this, arguments));
			},
			
			_preQuery: function () {
				return this.__execute(inherited._preQuery.apply(this, arguments));
			},
			
			_preSerialize: function () {
				return this.__execute(inherited._preSerialize.apply(this, arguments));
			},
			
			_preUnserialize: function () {
				return this.__execute(inherited._preUnserialize.apply(this, arguments));
			}
			
		};
	});
});


Scoped.define("module:Stores.ResilientStore", [
                                                 "module:Stores.BaseStore",
                                                 "base:Promise"
                                                 ], function (BaseStore, Promise, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (store, options) {
				this.__store = store;
				options = options || {};
				options.id_key = store.id_key();
				inherited.constructor.call(this, options);
				this._resilience = options.resilience || 10;
				if (options.destroy_store)
					this._auto_destroy(store);
			},

			_query_capabilities: function () {
				return this.__store._query_capabilities();
			},

			_insert: function () {
				return Promise.resilientCall(this._store.insert, this._store, this._resilience, arguments);
			},

			_remove: function () {
				return Promise.resilientCall(this._store.remove, this._store, this._resilience, arguments);
			},

			_get: function () {
				return Promise.resilientCall(this._store.get, this._store, this._resilience, arguments);
			},

			_update: function (id, data) {
				return Promise.resilientCall(this._store.update, this._store, this._resilience, arguments);
			},

			_query: function (query, options) {
				return Promise.resilientCall(this._store.update, this._store, this._resilience, arguments);
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


Scoped.define("module:Stores.SimulatorStore", [
                                               "module:Stores.PassthroughStore",
                                               "base:Promise"
                                               ], function (PassthroughStore, Promise, scoped) {
	return PassthroughStore.extend({scoped: scoped}, function (inherited) {			
		return {
			
			online: true,

			_preInsert: function () {
				return this.online ? inherited._preInsert.apply(this, arguments) : Promise.error("Offline");
			},
			
			_preRemove: function () {
				return this.online ? inherited._preRemove.apply(this, arguments) : Promise.error("Offline");
			},
			
			_preGet: function () {
				return this.online ? inherited._preGet.apply(this, arguments) : Promise.error("Offline");
			},
			
			_preUpdate: function () {
				return this.online ? inherited._preUpdate.apply(this, arguments) : Promise.error("Offline");
			},
			
			_preQuery: function () {
				return this.online ? inherited._preQuery.apply(this, arguments) : Promise.error("Offline");
			}
			
		};
	});
});


Scoped.define("module:Stores.TableStore", [
    "module:Stores.BaseStore",
    "base:Iterators.MappedIterator",
    "module:Queries.Constrained"
], function (BaseStore, MappedIterator, Constrained, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (table, options) {
				this.__table = table;
				options = options || {};
				options.id_key = table.primary_key();
				inherited.constructor.call(this, options);
				this.__options = {
					insertTags: options.insertTags || [],
					readTags: options.readTags || [],
					updateTags: options.updateTags || []
				};
			},

			_query_capabilities: function () {
				return Constrained.fullConstrainedQueryCapabilities();
			},

			_insert: function (data, ctx) {
				var model = this.__table.newModel({}, null, ctx);
				model.setByTags(data, this.__options.insertTags);
				return model.save().mapSuccess(function () {
					return model.asRecord(this.__options.readTags);
				}, this);
			},

			_remove: function (id, ctx) {
				return this.__table.findById(id, ctx).mapSuccess(function (model) {
					return model ? model.remove() : model;
				}, this);
			},

			_get: function (id, ctx) {
				return this.__table.findById(id, ctx).mapSuccess(function (model) {
					return model ? model.asRecord(this.__options.readTags) : model;
				}, this);
			},

			_update: function (id, data, ctx) {
				return this.__table.findById(id, ctx).mapSuccess(function (model) {
					if (!model)
						return model;
					model.setByTags(data, this.__options.updateTags);
					return model.save().mapSuccess(function () {
						return model.asRecord(this.__options.readTags);
					}, this);
				}, this);
			},

			_query: function (query, options, ctx) {
				return this.__table.query(query, options, ctx).mapSuccess(function (models) {
					return (new MappedIterator(models, function (model) {
						return model.asRecord(this.__options.readTags);
					}, this)).auto_destroy(models, true);
				}, this);
			}

		};
	});
});



Scoped.define("module:Stores.TransformationStore", [
                                                 "module:Stores.PassthroughStore",
                                                 "module:Queries",
                                                 "base:Iterators.MappedIterator",
                                                 "base:Objs",
                                                 "base:Types",
                                                 "base:Promise"
                                                 ], function (PassthroughStore, Queries, MappedIterator, Objs, Types, Promise, scoped) {
	return PassthroughStore.extend({scoped: scoped}, function (inherited) {			
		return {
			
			_encodeData: function (data) {
				return data;
			},
			
			_decodeData: function (data) {
				return data;
			},
			
			_encodeSort: function (sort) {
				return this._encodeData(sort);
			},
			
			_encodeId: function (id) {
				return this._store().id_of(this._encodeData(Objs.objectBy(this.id_key(), id)));
			},
			
			_decodeId: function (id) {
				return this.id_of(this._decodeData(Objs.objectBy(this._store().id_key(), id)));
			},
			
			_encodeQuery: function (query, options) {
				var opts = Objs.clone(options);
				if (opts.sort)
					opts.sort = Types.is_object(opts.sort) ? this._encodeSort(opts.sort) : {};
				return {
					query: Queries.mapKeyValue(query, function (key, value) {
						return this._encodeData(Objs.objectBy(key, value)); 
					}, this),
					options: opts
				};
			},

			_preInsert: function (data) {
				return Promise.create(this._encodeData(data));
			},
			
			_postInsert: function (data) {
				return Promise.create(this._decodeData(data));
			},
			
			_preRemove: function (id) {
				return Promise.create(this._encodeId(id));
			},
			
			_postRemove: function (id) {
				return Promise.create(true);
			},
			
			_preGet: function (id) {
				return Promise.create(this._encodeId(id));
			},
			
			_postGet: function (data) {
				return Promise.create(this._decodeData(data));
			},

			_preUpdate: function (id, data) {
				return Promise.create({id: this._encodeId(id), data: this._encodeData(data)});
			},
			
			_postUpdate: function (row) {
				return Promise.create(this._decodeData(row));
			},
			
			_preQuery: function (query, options) {
				return Promise.create(this._encodeQuery(query, options));
			},
			
			_postQuery: function (results) {
				return Promise.create((new MappedIterator(results, function (data) {
					return this._decodeData(data);
				}, this)).auto_destroy(results, true));
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

Scoped.define("module:Stores.LocalStore", ["module:Stores.AssocDumbStore"], function (AssocDumbStore, scoped) {
	return AssocDumbStore.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (options) {
				inherited.constructor.call(this, options);
				this.__prefix = options.prefix;
				this.__localStorage = Scoped.getGlobal("localStorage");
			},

			__key: function (key) {
				return this.__prefix + key;
			},

			_read_key: function (key) {
				try {
					return JSON.parse(this.__localStorage.getItem(this.__key(key)));
				} catch (e) {
					return null;
				}
			},

			_write_key: function (key, value) {
				this.__localStorage.setItem(this.__key(key), JSON.stringify(value));
			},

			_remove_key: function (key) {
				this.__localStorage.removeItem(this.__key(key));
			}

		};
	});
});

Scoped.define("module:Stores.Invokers.RestInvokeeAjaxInvoker", [
    "base:Class",
    "base:Net.Uri",
    "base:Net.HttpHeader",
    "module:Stores.Invokers.RestInvokee"
], function (Class, Uri, HttpHeader, Invokee, scoped) {
	return Class.extend({scoped: scoped}, [Invokee, function (inherited) {
		return {
			
			constructor: function (ajax) {
				inherited.constructor.call(this);
				this.__ajax = ajax;
			},
			
			restInvoke: function (method, uri, post, get) {
				return this.__ajax.execute({
					method: method,
					data: post,
					uri: Uri.appendUriParams(uri, get)
				}).mapError(function (error) {
					return {
						error: error.status_code(),
						data: error.data ? error.data() : null,
						invalid: error.status_code() === HttpHeader.HTTP_STATUS_PRECONDITION_FAILED
					};
				}, this);
			}			
			
		};
	}]);
});
Scoped.define("module:Stores.Invokers.StoreInvokee", [], function () {
	return {
		storeInvoke: function (member, data, context) {}
	};
});


Scoped.define("module:Stores.Invokers.RestInvokee", [], function () {
	return {
		restInvoke: function (method, uri, post, get, ctx) {}
	};
});


Scoped.define("module:Stores.Invokers.RouteredRestInvokee", [], function () {
	return {
		routeredRestInvoke: function (member, uriData, post, get, ctx) {}
	};
});



Scoped.define("module:Stores.Invokers.InvokerStore", [
    "module:Stores.BaseStore",
    "module:Queries.Constrained"
], function (BaseStore, Constrained, scoped) {
	return BaseStore.extend({scoped: scoped}, function (inherited) {			
		return {
			
			constructor: function (storeInvokee, options) {
				inherited.constructor.call(this, options);
				this.__storeInvokee = storeInvokee;
			},
			
			_query_capabilities: function () {
				return Constrained.fullConstrainedQueryCapabilities();
			},
			
			__invoke: function (member, data, context) {
				return this.__storeInvokee.storeInvoke(member, data, context);
			},

			_insert: function (data, ctx) {
				return this.__invoke("insert", data, ctx);
			},

			_remove: function (id, ctx) {
				return this.__invoke("remove", id, ctx);
			},

			_get: function (id, ctx) {
				return this.__invoke("get", id, ctx);
			},

			_update: function (id, data, ctx) {
				return this.__invoke("update", {
					id: id,
					data: data
				}, ctx);
			},

			_query: function (query, options, ctx) {
				return this.__invoke("query", {
					query: query,
					options: options
				}, ctx);
			}

		};
	});
});




Scoped.define("module:Stores.Invokers.StoreInvokeeInvoker", ["base:Class", "module:Stores.Invokers.StoreInvokee"], function (Class, Invokee, scoped) {
	return Class.extend({scoped: scoped}, [Invokee, function (inherited) {		
		return {
					
			constructor: function (store) {
				inherited.constructor.apply(this);
				this.__store = store;
			},
			
			storeInvoke: function (member, data, context) {
				return this["__" + member](data, context);
			},
			
			__insert: function (data, context) {
				return this.__store.insert(data, context);
			},
		
			__remove: function (id, context) {
				return this.__store.remove(id, context);
			},

			__get: function (id, context) {
				return this.__store.get(id, context);
			},

			__update: function (data, context) {
				return this.__store.update(data.id, data.data, context);
			},

			__query: function (data, context) {
				return this.__store.query(data.query, data.options, context);
			}

		};
	}]);
});
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
								data: post
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

/*
 * Very important to know:
 *  - If both itemCache + remoteStore use the same id_key, the keys actually coincide.
 *  - If they use different keys, the cache stores the remoteStore keys as a foreign key and assigns its own keys to the cached items
 *
 */

Scoped.define("module:Stores.CachedStore", [
	"module:Stores.BaseStore",
	"module:Stores.MemoryStore",
	"module:Queries",
	"module:Queries.Constrained",
	"module:Stores.CacheStrategies.ExpiryCacheStrategy",
	"base:Promise",
	"base:Objs",
	"base:Types",
	"base:Iterators.ArrayIterator",
	"base:Iterators.MappedIterator",
	"base:Timers.Timer"
], function (Store, MemoryStore, Queries, Constrained, ExpiryCacheStrategy, Promise, Objs, Types, ArrayIterator, MappedIterator, Timer, scoped) {
	return Store.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (remoteStore, options) {
				inherited.constructor.call(this);
				this.remoteStore = remoteStore;
				this._options = Objs.extend({
					itemMetaKey: "meta",
					queryMetaKey: "meta",
					queryKey: "query",
					cacheKey: null,
					suppAttrs: {},
					optimisticRead: false
				}, options);
				this._online = true;
				this.itemCache = this._options.itemCache || this.auto_destroy(new MemoryStore({
					id_key: this._options.cacheKey || this.remoteStore.id_key()
				}));
				this._options.cacheKey = this.itemCache.id_key();
				this._id_key = this.itemCache.id_key();
				this._foreignKey = this.itemCache.id_key() !== this.remoteStore.id_key();
				this.queryCache = this._options.queryCache || this.auto_destroy(new MemoryStore());
				this.cacheStrategy = this._options.cacheStrategy || this.auto_destroy(new ExpiryCacheStrategy());
				if (this._options.auto_cleanup) {
					this.auto_destroy(new Timer({
						fire: this.cleanup,
						context: this,
						start: true,
						delay: this._options.auto_cleanup
					}));
				}
			},

			_query_capabilities: function () {
				return Constrained.fullConstrainedQueryCapabilities();
			},

			_insert: function (data, ctx) {
				return this.cacheInsert(data, {
					lockItem: true,
					silent: true,
					refreshMeta: false,
					accessMeta: true
				}, ctx);
			},

			_update: function (id, data, ctx) {
				return this.cacheUpdate(id, data, {
					ignoreLock: false,
					silent: true,
					lockAttrs: true,
					refreshMeta: false,
					accessMeta: true
				}, ctx);
			},

			_remove: function (id, ctx) {
				return this.cacheRemove(id, {
					ignoreLock: true,
					silent: true
				}, ctx);
			},

			_get: function (id, ctx) {
				return this.cacheGet(id, {
					silentInsert: true,
					silentUpdate: true,
					silentRemove: true,
					refreshMeta: true,
					accessMeta: true
				}, ctx);
			},

			_query: function (query, options, ctx) {
				return this.cacheQuery(query, options, {
					silent: true,
					queryRefreshMeta: true,
					queryAccessMeta: true,
					refreshMeta: true,
					accessMeta: true
				}, ctx);
			},

			/*
			 * options:
			 *   - lockItem: boolean
			 *   - silent: boolean
			 *   - refreshMeta: boolean
			 *   - accessMeta: boolean
			 */

			cacheInsert: function (data, options, ctx) {
				var meta = {
					lockedItem: options.lockItem,
					lockedAttrs: {},
					refreshMeta: options.refreshMeta ? this.cacheStrategy.itemRefreshMeta() : null,
					accessMeta: options.accessMeta ? this.cacheStrategy.itemAccessMeta() : null
				};
				return this.itemCache.insert(this.addItemSupp(this.addItemMeta(data, meta)), ctx).mapSuccess(function (result) {
					data = this.removeItemMeta(result);
					if (!options.silent)
						this._inserted(data, ctx);
					return data;
				}, this);
			},

			/*
			 * options:
			 *   - ignoreLock: boolean
			 *   - lockAttrs: boolean
			 *   - silent: boolean
			 *   - accessMeta: boolean
			 *   - refreshMeta: boolean
			 *   - foreignKey: boolean (default false)
			 *   - unlockItem: boolean (default false)
			 */

			cacheUpdate: function (id, data, options, ctx) {
				var foreignKey = options.foreignKey && this._foreignKey;
				var itemPromise = foreignKey ?
					              this.itemCache.getBy(this.remoteStore.id_key(), id, ctx)
					            : this.itemCache.get(id, ctx);
				return itemPromise.mapSuccess(function (item) {
					if (!item)
						return null;
					var meta = this.readItemMeta(item);
					if (options.unlockItem) {
						meta.lockedItem = false;
						meta.lockedAttrs = {};
					}
					data = Objs.filter(data, function (value, key) {
						return (options.ignoreLock || (!meta.lockedItem && !meta.lockedAttrs[key])) && (!(key in item) || item[key] != value);
					}, this);
					/*
					if (Types.is_empty(data))
						return this.removeItemMeta(item);
					*/
					if (options.lockAttrs) {
						Objs.iter(data, function (value, key) {
							meta.lockedAttrs[key] = true;
						}, this);
					}
					if (options.refreshMeta)
						meta.refreshMeta = this.cacheStrategy.itemRefreshMeta(meta.refreshMeta);
					if (options.accessMeta)
						meta.accessMeta = this.cacheStrategy.itemAccessMeta(meta.accessMeta);
					return this.itemCache.update(this.itemCache.id_of(item), this.addItemMeta(data, meta), ctx).mapSuccess(function (result) {
						result = this.removeItemMeta(result);
						if (!options.silent)
							this._updated(result, data, ctx);
						return result;
					}, this);
				}, this);
			},

			cacheInsertUpdate: function (data, options, ctx) {
				var foreignKey = options.foreignKey && this._foreignKey;
				var itemPromise = foreignKey ?
					              this.itemCache.getBy(this.remoteStore.id_key(), this.remoteStore.id_of(data), ctx)
					            : this.itemCache.get(this.itemCache.id_of(data), ctx);
				return itemPromise.mapSuccess(function (item) {
					options.foreignKey = false;
					if (!item)
                        return this.cacheInsert(data, options, ctx);
					var backup = Objs.clone(data, 1);
					var itemId = this.itemCache.id_of(item);
					backup[this.itemCache.id_key()] = itemId;
					return this.cacheUpdate(itemId, data, options, ctx).mapSuccess(function (result) {
						return Objs.extend(backup, result);
					});
				}, this);
			},

			/*
			 * options:
			 *   - ignoreLock: boolean
			 *   - silent: boolean
			 *   - foreignKey: boolean
			 */
			cacheRemove: function (id, options, ctx) {
				var foreignKey = options.foreignKey && this._foreignKey;
				var itemPromise = foreignKey ?
					  this.itemCache.getBy(this.remoteStore.id_key(), id, ctx)
					: this.itemCache.get(id, ctx);
				return itemPromise.mapSuccess(function (data) {
					if (!data)
						return data;
					var meta = this.readItemMeta(data);
					if (!options.ignoreLock && (meta.lockedItem || !Types.is_empty(meta.lockedAttrs)))
						return Promise.error("locked item");
					var cached_id = this.itemCache.id_of(data);
					return this.itemCache.remove(cached_id, ctx).mapSuccess(function () {
						if (!options.silent)
							this._removed(cached_id, ctx, data);
						return data;
					}, this);
				}, this);
			},
			
			cacheOnlyGet: function (id, options, ctx) {
				var foreignKey = options.foreignKey && this._foreignKey;
				var itemPromise = foreignKey ?
					  this.itemCache.getBy(this.remoteStore.id_key(), id, ctx)
					: this.itemCache.get(id, ctx);
				return itemPromise;
			},

			/*
			 * options:
			 *   - silentInsert: boolean
			 *   - silentUpdate: boolean
			 *   - silentRemove: boolean
			 *   - refreshMeta: boolean
			 *   - accessMeta: boolean
			 *   - foreignKey: boolean
			 */
			cacheGet: function (id, options, ctx) {
				var foreignKey = options.foreignKey && this._foreignKey;
				return this.cacheOnlyGet(id, options, ctx).mapSuccess(function (data) {
					if (!data) {
						if (!foreignKey && this._foreignKey)
							return data;
						return this.remoteStore.get(id, ctx).mapSuccess(function (data) {
							this.online();
							if (data) {
								return this.cacheInsert(data, {
									lockItem: false,
									silent: options.silentInsert,
									accessMeta: true,
									refreshMeta: true
								}, ctx);
							} else
								return data;
						}, this);
					}
					var meta = this.readItemMeta(data);
					var cached_id = this.itemCache.id_of(data);
					var remote_id = this.remoteStore.id_of(data);
					if (this.cacheStrategy.validItemRefreshMeta(meta.refreshMeta) || meta.lockedItem) {
						if (options.accessMeta) {
							meta.accessMeta = this.cacheStrategy.itemAccessMeta(meta.accessMeta);
							this.itemCache.update(cached_id, this.addItemMeta({}, meta), ctx);
						}
						return this.removeItemMeta(data);
					}
					return this.remoteStore.get(remote_id, ctx).mapSuccess(function (data) {
						this.online();
						if (data) {
							return this.cacheUpdate(cached_id, data, {
								ignoreLock: false,
								lockAttrs: false,
								silent: options.silentUpdate,
								accessMeta: true,
								refreshMeta: true
							}, ctx);
						} else {
							return this.cacheRemove(cached_id, {
								ignoreLock: false,
								silent: options.silentRemove
							}, ctx);
						}
					}, this).mapError(function () {
						this.offline();
						return Promise.value(data);
					}, this);
				}, this);
			},
			
			__itemCacheQuery: function (query, options, ctx) {
				return this.itemCache.query(query, options, ctx).mapSuccess(function (items) {
					items = items.asArray();
					Objs.iter(items, function (item) {
						this.cacheUpdate(this.itemCache.id_of(item), {}, {
							lockItem: false,
							lockAttrs: false,
							silent: true,
							accessMeta: options.accessMeta,
							refreshMeta: false
						}, ctx);
					}, this);
					var arrIter = new ArrayIterator(items);
					return (new MappedIterator(arrIter, this.removeItemMeta, this)).auto_destroy(arrIter, true);
				}, this);
			},

			/*
			 * options:
			 *   - silent: boolean
			 *   - queryRefreshMeta: boolean
			 *   - queryAccessMeta: boolean
			 *   - refreshMeta: boolean
			 *   - accessMeta: boolean
			 */
			cacheQuery: function (query, queryOptions, options, ctx) {
				var queryString = Constrained.serialize({
					query: query,
					options: queryOptions
				});
				var localQuery = Objs.objectBy(
					this._options.queryKey,
					queryString
				);
				return this.queryCache.query(localQuery, {limit : 1}, ctx).mapSuccess(function (resultIter) {
					result = resultIter.hasNext() ? resultIter.next() : null;
					resultIter.destroy();
					if (result) {
						var meta = this.readQueryMeta(result);
						var query_id = this.queryCache.id_of(result);
						if (this.cacheStrategy.validQueryRefreshMeta(meta.refreshMeta)) {
							if (options.queryAccessMeta) {
								meta.accessMeta = this.cacheStrategy.queryAccessMeta(meta.accessMeta);
								this.queryCache.update(query_id, this.addQueryMeta({}, meta), ctx);
							}
							return this.__itemCacheQuery(query, queryOptions, ctx);
						}
						this.queryCache.remove(query_id, ctx);
					}
					// Note: This is probably not good enough in the most general cases.
					if (Queries.queryDeterminedByAttrs(query, this._options.suppAttrs))
						return this.itemCache.query(query, queryOptions, ctx);
					var remotePromise = this.remoteStore.query(query, queryOptions, ctx).mapSuccess(function (items) {
						this.online();
						items = items.asArray();
						var meta = {
							refreshMeta: options.queryRefreshMeta ? this.cacheStrategy.queryRefreshMeta() : null,
							accessMeta: options.queryAccessMeta ? this.cacheStrategy.queryAccessMeta() : null
						};
						this.queryCache.insert(Objs.objectBy(
							this._options.queryKey, queryString,
							this._options.queryMetaKey, meta
						), ctx);
						var promises = [];
						Objs.iter(items, function (item) {
							promises.push(this.cacheInsertUpdate(item, {
								lockItem: false,
								lockAttrs: false,
								silent: options.silent && !this._options.optimisticRead,
								accessMeta: options.accessMeta,
								refreshMeta: options.refreshMeta,
								foreignKey: true
							}, ctx));
						}, this);
						return Promise.and(promises).mapSuccess(function (items) {
							var arrIter = new ArrayIterator(items);
							return (new MappedIterator(arrIter, this.addItemSupp, this)).auto_destroy(arrIter, true);
						}, this);
					}, this).mapError(function () {
						this.offline();
						if (!this._options.optimisticRead) {
							return this.__itemCacheQuery(query, queryOptions, ctx);
						}
					}, this);
					return this._options.optimisticRead ? this.__itemCacheQuery(query, queryOptions, ctx) : remotePromise;
				}, this);
			},

			online: function () {
				this.trigger("online");
				this._online = true;
			},

			offline: function () {
				this.trigger("offline");
				this._online = false;
			},

			addItemMeta: function (data, meta) {
				data = Objs.clone(data, 1);
				data[this._options.itemMetaKey] = meta;
				return data;
			},

			addItemSupp: function (data) {
				return Objs.extend(Objs.clone(this._options.suppAttrs, 1), data);
			},
			
			removeItemSupp: function (data) {
				if (!this._options.suppAttrs)
					return data;
				return Objs.filter(data, function (value, key) {
					return !(key in this._options.suppAttrs);
				}, this);
			},

			addQueryMeta: function (data, meta) {
				data = Objs.clone(data, 1);
				data[this._options.queryMetaKey] = meta;
				return data;
			},

			removeItemMeta: function (data) {
				data = Objs.clone(data, 1);
				delete data[this._options.itemMetaKey];
				return data;
			},

			removeQueryMeta: function (data) {
				data = Objs.clone(data, 1);
				delete data[this._options.queryMetaKey];
				return data;
			},

			readItemMeta: function (data) {
				return data[this._options.itemMetaKey];
			},

			readQueryMeta: function (data) {
				return data[this._options.queryMetaKey];
			},

			unlockItem: function (id, ctx) {
				this.itemCache.get(id, ctx).success(function (data) {
					if (!data)
						return;
					var meta = this.readItemMeta(data);
					meta.lockedItem = false;
					meta.lockedAttrs = {};
					this.itemCache.update(id, this.addItemMeta({}, meta), ctx);
				}, this);
			},

			cleanup: function () {
				if (!this._online)
					return;
				this.queryCache.query().success(function (queries) {
					while (queries.hasNext()) {
						var query = queries.next();
						var meta = this.readQueryMeta(query);
						if (!this.cacheStrategy.validQueryRefreshMeta(meta.refreshMeta) || !this.cacheStrategy.validQueryAccessMeta(meta.accessMeta))
							this.queryCache.remove(this.queryCache.id_of(query));
					}
					queries.destroy();
				}, this);
				this.itemCache.query().success(function (items) {
					while (items.hasNext()) {
						var item = items.next();
						var meta = this.readItemMeta(item);
						if (!meta.lockedItem && Types.is_empty(meta.lockedAttrs) &&
							(!this.cacheStrategy.validItemRefreshMeta(meta.refreshMeta) || !this.cacheStrategy.validItemAccessMeta(meta.accessMeta)))
							this.itemCache.remove(this.itemCache.id_of(item));
					}
					items.destroy();
				}, this);
			},

			cachedIdToRemoteId: function (cachedId) {
				if (!this._foreignKey)
					return Promise.value(cachedId);
				return this.itemCache.get(cachedId).mapSuccess(function (item) {
					return item ? this.remoteStore.id_of(item) : null;
				}, this);
			},
			
			serialize: function () {
				return this.itemCache.serialize().mapSuccess(function (itemCacheSerialized) {
					return this.queryCache.serialize().mapSuccess(function (queryCacheSerialized) {
						return {
							items: itemCacheSerialized,
							queries: queryCacheSerialized
						};
					}, this);
				}, this);
			},
			
			unserialize: function (data) {
				return this.itemCache.unserialize(data.items).mapSuccess(function (items) {
					this.queryCache.unserialize(data.queries);
					return items.map(function (item) {
						return this.removeItemMeta(item);
					}, this);
				}, this);
			}

		};
	});
});



Scoped.define("module:Stores.CacheStrategies.CacheStrategy", [
                                                              "base:Class"    
                                                              ], function (Class, scoped) {
	return Class.extend({scoped: scoped}, {

		itemRefreshMeta: function (refreshMeta) {},

		queryRefreshMeta: function (refreshMeta) {},

		itemAccessMeta: function (accessMeta) {},

		queryAccessMeta: function (accessMeta) {},

		validItemRefreshMeta: function (refreshMeta) {},

		validQueryRefreshMeta: function (refreshMeta) {},

		validItemAccessMeta: function (accessMeta) {},

		validQueryAccessMeta: function (accessMeta) {}


	});	
});


Scoped.define("module:Stores.CacheStrategies.ExpiryCacheStrategy", [
                                                                    "module:Stores.CacheStrategies.CacheStrategy",
                                                                    "base:Time",
                                                                    "base:Objs"
                                                                    ], function (CacheStrategy, Time, Objs, scoped) {
	return CacheStrategy.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (options) {
				inherited.constructor.call(this);
				this._options = Objs.extend({
					itemRefreshTime: 24 * 60 * 1000,
					itemAccessTime: 10 * 60 * 60 * 1000,
					queryRefreshTime: 24 * 60 * 1000,
					queryAccessTime: 10 * 60 * 60 * 1000,
					now: function () {
						return Time.now();
					}
				}, options);
			},

			itemRefreshMeta: function (refreshMeta) {
				if (refreshMeta)
					return refreshMeta;
				if (this._options.itemRefreshTime === null)
					return null;
				return this._options.now() + this._options.itemRefreshTime;
			},

			queryRefreshMeta: function (refreshMeta) {
				if (refreshMeta)
					return refreshMeta;
				if (this._options.queryRefreshTime === null)
					return null;
				return this._options.now() + this._options.queryRefreshTime;
			},

			itemAccessMeta: function (accessMeta) {
				if (this._options.itemAccessTime === null)
					return null;
				return this._options.now() + this._options.itemAccessTime;
			},

			queryAccessMeta: function (accessMeta) {
				if (this._options.queryAccessTime === null)
					return null;
				return this._options.now() + this._options.queryAccessTime;
			},

			validItemRefreshMeta: function (refreshMeta) {
				return this._options.itemRefreshTime === null || refreshMeta >= this._options.now();
			},

			validQueryRefreshMeta: function (refreshMeta) {
				return this._options.queryRefreshTime === null || refreshMeta >= this._options.now();
			},	

			validItemAccessMeta: function (accessMeta) {
				return this._options.itemAccessTime === null || accessMeta >= this._options.now();
			},

			validQueryAccessMeta: function (accessMeta) {
				return this._options.queryAccessTime === null || accessMeta >= this._options.now();
			}

		};
	});	
});
Scoped.define("module:Stores.PartialStoreWriteStrategies.WriteStrategy", [
                                                                          "base:Class"
                                                                          ], function (Class, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {
			
			init: function (partialStore) {
				this.partialStore = partialStore;
			},

			insert: function (data, ctx) {},

			remove: function (id, ctx) {},

			update: function (data, ctx) {}

		};
	});
});

Scoped.define("module:Stores.PartialStoreWriteStrategies.PostWriteStrategy", [
	"module:Stores.PartialStoreWriteStrategies.WriteStrategy",
	"base:Types",
	"base:Objs"
], function (Class, Types, Objs, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {

			insert: function (data, ctx) {
				return this.partialStore.remoteStore.insert(data, ctx).mapSuccess(function (data) {
					return this.partialStore.cachedStore.cacheInsert(data, {
						lockItem: false,
						silent: true,
						refreshMeta: true,
						accessMeta: true
					}, ctx);
				}, this);
			},

			remove: function (cachedId, ctx) {
				return this.partialStore.cachedStore.cachedIdToRemoteId(cachedId).mapSuccess(function (remoteId) {
					return this.partialStore.remoteStore.remove(remoteId, ctx).mapSuccess(function () {
						return this.partialStore.cachedStore.cacheRemove(cachedId, {
							ignoreLock: true,
							silent: true
						}, ctx);
					}, this);
				}, this);
			},

			update: function (cachedId, data, ctx) {
				var inner = function (updatedData) {
					var merger = Objs.extend(Objs.clone(data, 1), updatedData);
                    return this.partialStore.cachedStore.cacheUpdate(cachedId, merger, {
                        ignoreLock: false,
                        lockAttrs: false,
                        silent: true,
                        refreshMeta: true,
                        accessMeta: true
                    }, ctx);
				};
                var remoteRequired = !Types.is_empty(this.partialStore.cachedStore.removeItemSupp(data));
                if (!remoteRequired)
                	return inner.call(this);
				return this.partialStore.cachedStore.cachedIdToRemoteId(cachedId).mapSuccess(function (remoteId) {
					return this.partialStore.remoteStore.update(remoteId, data, ctx).mapSuccess(function (updatedData) {
						return inner.call(this, updatedData);
					}, this);
				}, this);
			}

		};
	});
});


Scoped.define("module:Stores.PartialStoreWriteStrategies.PreWriteStrategy", [
    "module:Stores.PartialStoreWriteStrategies.WriteStrategy",
    "base:Objs"
], function (Class, Objs, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {

			insert: function (data) {
				return this.partialStore.cachedStore.cacheInsert(data, {
					lockItem: true,
					silent: true,
					refreshMeta: true,
					accessMeta: true
				}).mapSuccess(function (data) {
					nosuppdata = this.partialStore.cachedStore.removeItemSupp(data);
					return this.partialStore.remoteStore.insert(nosuppdata).mapSuccess(function (remoteData) {
						return this.partialStore.cachedStore.cacheUpdate(this.partialStore.cachedStore.id_of(data), remoteData, {
							silent: true,
							unlockItem: true
						}).mapSuccess(function (addedRemoteData) {
							return Objs.extend(Objs.clone(data, 1), addedRemoteData);
						}, this);
					}, this).error(function () {
						this.partialStore.cachedStore.cacheRemove(this.partialStore.cachedStore.id_of(data), {
							ignoreLock: true,
							silent: false
						});
					}, this);
				}, this);
			},

			remove: function (cachedId) {
				return this.partialStore.cachedStore.cachedIdToRemoteId(cachedId).mapSuccess(function (remoteId) {
					return this.partialStore.cachedStore.cacheRemove(cachedId, {
						ignoreLock: true,
						silent: true
					}).success(function () {
						this.partialStore.remoteStore.remove(remoteId);
					}, this);
				}, this);
			},

			update: function (cachedId, data) {
				return this.partialStore.cachedStore.cachedIdToRemoteId(cachedId).mapSuccess(function (remoteId) {
					return this.partialStore.cachedStore.cacheUpdate(cachedId, data, {
						lockAttrs: true,
						ignoreLock: false,
						silent: true,
						refreshMeta: false,
						accessMeta: true
					}).success(function (data) {
						data = this.partialStore.cachedStore.removeItemSupp(data);
						this.partialStore.remoteStore.update(remoteId, data).success(function () {
							this.partialStore.cachedStore.unlockItem(cachedId);
						}, this);
					}, this);
				}, this);
			}
	
		};
	});
});


Scoped.define("module:Stores.PartialStoreWriteStrategies.CommitStrategy", [
	"module:Stores.PartialStoreWriteStrategies.WriteStrategy",
	"module:Stores.StoreHistory",
	"module:Stores.MemoryStore",
	"base:Objs",
	"base:Timers.Timer",
	"base:Promise"
], function (Class, StoreHistory, MemoryStore, Objs, Timer, Promise, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (historyStore, options) {
				inherited.constructor.call(this);
				this._options = options || {};
				this.historyStore = this._options.historyStore || this.auto_destroy(new MemoryStore());
			},
			
			init: function (partialStore) {
				inherited.init.call(this, partialStore);
				this.storeHistory = this.auto_destroy(new StoreHistory(null, this.historyStore, Objs.extend({
					source_id_key: partialStore.cachedStore.itemCache.id_key(),
					row_data: {
						pushed: false,
						success: false
					},
					filter_data: {
						pushed: false
					}
				}, this._options)));
				if (this._options.auto_push) {
					this._timer = this.auto_destroy(new Timer({
						fire: function () {
							this.push(this.partialStore);
						},
						context: this,
						start: true,
						delay: this._options.auto_push
					}));
				}
			},

			insert: function (data) {
				return this.partialStore.cachedStore.cacheInsert(data, {
					lockItem: true,
					silent: true,
					refreshMeta: true,
					accessMeta: true
				}).success(function (data) {
					data = this.partialStore.cachedStore.removeItemSupp(data);
					this.storeHistory.sourceInsert(data);
				}, this);
			},

			remove: function (id) {
				return this.partialStore.cachedStore.cachedIdToRemoteId(id).mapSuccess(function (remoteId) {
					return this.partialStore.cachedStore.cacheRemove(id, {
						ignoreLock: true,
						silent: true
					}).mapSuccess(function (data) {
						this.storeHistory.sourceRemove(id, this.partialStore.remoteStore.id_row(remoteId));
						return data;
					}, this);
				}, this);
			},

			update: function (id, data) {
				return this.partialStore.cachedStore.cacheUpdate(id, data, {
					lockAttrs: true,
					ignoreLock: true, // this was false before, not sure why.
					silent: true,
					refreshMeta: false,
					accessMeta: true
				}).success(function () {
					data = this.partialStore.cachedStore.removeItemSupp(data);
					this.storeHistory.sourceUpdate(id, data);
				}, this);
			},
			
			push: function () {
				if (this.pushing)
					return Promise.value(true);
				var failedIds = {};
				var unlockIds = {};
				var hs = this.storeHistory.historyStore;
                this.storeHistory.lockCommits();
				var iter = hs.query({success: false}, {sort: {commit_id: 1}}).value();
				var next = function () {
					if (!iter.hasNext()) {
						this.pushing = false;
						this.storeHistory.unlockCommits();
						Objs.iter(unlockIds, function (value, id) {
							if (value) {
								if (value === true) {
									this.partialStore.cachedStore.unlockItem(id);
								} else {
									this.partialStore.cachedStore.cacheUpdate(id, value, {
										unlockItem: true,
										silent: true
									});
								}
							}
						}, this);
                        iter.destroy();
						return Promise.value(true);
					}
					var commit = iter.next();
					var commit_id = hs.id_of(commit);
					if (commit_id in failedIds) {
						hs.update(commit_id, {
							pushed: true,
							success: false
						});
						return next.apply(this);
					} else {
						var promise = null;
						if (commit.type === "insert") {
							promise = this.partialStore.remoteStore.insert(commit.row);
						} else if (commit.type === "update") {
							promise = this.partialStore.cachedStore.cachedIdToRemoteId(commit.row_id).mapSuccess(function (remoteId) {
								return this.partialStore.remoteStore.update(remoteId, commit.row);
							}, this);
						} else if (commit.type === "remove") {
							promise = this.partialStore.remoteStore.remove(commit.row ? this.partialStore.remoteStore.id_of(commit.row) : commit.row_id);
						}
						return promise.mapSuccess(function (ret) {
							hs.update(commit_id, {
								pushed: true,
								success: true
							});
							if (!(commit.row_id in unlockIds)) {
								unlockIds[commit.row_id] = true;
								if (commit.type === "insert") {
									unlockIds[commit.row_id] = ret;
								}
							}
							return next.apply(this);
						}, this).mapError(function () {
							hs.update(commit_id, {
								pushed: true,
								success: false
							});
							failedIds[commit_id] = true;
							unlockIds[commit.row_id] = false;
							return next.apply(this);
						}, this);
					}
				};
				return next.apply(this);
			}

		};
	});
});



Scoped.define("module:Stores.PartialStoreWriteStrategies.DelegatedWriteStrategy", [
    "module:Stores.PartialStoreWriteStrategies.WriteStrategy"
], function (Class, scoped) {
    return Class.extend({scoped: scoped}, function (inherited) {
        return {

            constructor: function (insertWriteStrategy, updateWriteStrategy, removeWriteStrategy) {
                inherited.constructor.call(this);
                this._insertWriteStrategy = insertWriteStrategy;
                this._updateWriteStrategy = updateWriteStrategy;
                this._removeWriteStrategy = removeWriteStrategy;
            },

            init: function (partialStore) {
                inherited.init.call(this, partialStore);
                this._insertWriteStrategy.init(partialStore);
                this._updateWriteStrategy.init(partialStore);
                this._removeWriteStrategy.init(partialStore);
            },

            insert: function () {
                return this._insertWriteStrategy.insert.apply(this._insertWriteStrategy, arguments);
            },

            remove: function () {
                return this._updateWriteStrategy.remove.apply(this._updateWriteStrategy, arguments);
            },

            update: function () {
                return this._removeWriteStrategy.update.apply(this._removeWriteStrategy, arguments);
            }

        };
    });
});


Scoped.define("module:Stores.PartialStore", [
	"module:Stores.BaseStore",
	"module:Stores.CachedStore",
	"module:Stores.PartialStoreWriteStrategies.PostWriteStrategy",
	"module:Stores.PartialStoreWatcher",
	"base:Objs",
	"base:Types"
], function (Store, CachedStore, PostWriteStrategy, PartialStoreWatcher, Objs, Types, scoped) {
	return Store.extend({scoped: scoped}, function (inherited) {			
		return {

			constructor: function (remoteStore, options) {
				inherited.constructor.call(this, options);
				this._options = Objs.extend({}, options);
				if (this._options.remoteWatcher)
					this.remoteWatcher = this._options.remoteWatcher;
				this.remoteStore = remoteStore;
				this.cachedStore = new CachedStore(remoteStore, this._options);
				this.writeStrategy = this._options.writeStrategy || this.auto_destroy(new PostWriteStrategy());
				if (this.remoteWatcher) {
					this.remoteWatcher.on("insert", this._remoteInsert, this);
					this.remoteWatcher.on("update", this._remoteUpdate, this);
					this.remoteWatcher.on("remove", this._remoteRemove, this);
					this._watcher = new PartialStoreWatcher(this);
				}
				this.cachedStore.on("insert", this._inserted, this);
				this.cachedStore.on("remove", this._removed, this);
				this.cachedStore.on("update", this._updated, this);
				this.writeStrategy.init(this);
			},
			
			id_key: function () {
				return this.cachedStore.id_key();
			},
			
			destroy: function () {
				if (this.remoteWatcher)
					this.remoteWatcher.off(null, null, this);
				if (this._watcher)
					this._watcher.destroy();
				this.cachedStore.destroy();
				inherited.destroy.call(this);
			},

			_insert: function (data, ctx) {
				return this.writeStrategy.insert(data, ctx);
			},
			
			_remove: function (id, ctx) {
				return this.writeStrategy.remove(id, ctx);
			},
			
			_update: function (id, data, ctx) {
				return this.cachedStore.cacheOnlyGet(id, {}, ctx).mapSuccess(function (cachedData) {
					var diff = Objs.diff(data, cachedData);
					return Types.is_empty(diff) ? cachedData : this.writeStrategy.update(id, data, ctx);
				}, this);
			},

			_get: function (id, ctx) {
				return this.cachedStore.get(id, ctx);
			},
			
			_query: function (query, options, ctx) {
				return this.cachedStore.query(query, options, ctx);
			},			
			
			_query_capabilities: function () {
				return this.cachedStore._query_capabilities();
			},
			
			_remoteInsert: function (data, ctx) {
				this.cachedStore.cacheInsertUpdate(data, {
					lockItem: false,
					silent: false,
					refreshMeta: true,
					accessMeta: true,
					foreignKey: true
				}, ctx);
			},
			
			_remoteUpdate: function (row, data, ctx) {
				var id = this.remoteStore.id_of(row);
				this.cachedStore.cacheUpdate(id, data, {
					ignoreLock: false,
					lockAttrs: false,
					silent: false,
					accessMeta: true,
					refreshMeta: true,
					foreignKey: true
				}, ctx);
			},
			
			_remoteRemove: function (id, ctx) {
				this.cachedStore.cacheRemove(id, {
					ignoreLock: false,
					silent: false,
					foreignKey: true
				}, ctx);
			},
			
			serialize: function () {
				return this.cachedStore.serialize();
			},
			
			unserialize: function (data) {
				return this.cachedStore.unserialize(data).success(function (items) {
					items.forEach(function (item) {
						this._inserted(item);
					}, this);
				}, this);
			}

		};
	});	
});


Scoped.define("module:Stores.PartialStoreWatcher", [
    "module:Stores.Watchers.LocalWatcher"                                                    
], function (StoreWatcher, scoped) {
	return StoreWatcher.extend({scoped: scoped}, function (inherited) {
		return {
			
			_watchItem : function(id) {
				inherited.watchItem.call(this, id);
				this._store.cachedStore.cachedIdToRemoteId(id).success(function (remoteId) {
					this._store.remoteWatcher.watchItem(remoteId, this);
				}, this);
			},

			_unwatchItem : function(id) {
				inherited.unwatchItem.call(this, id);
				this._store.cachedStore.cachedIdToRemoteId(id).success(function (remoteId) {
					this._store.remoteWatcher.unwatchItem(remoteId, this);
				}, this);
			},

			_watchInsert : function(query) {
				inherited.watchInsert.call(this, query);
				this._store.remoteWatcher.watchInsert(query, this);
			},

			_unwatchInsert : function(query) {
				inherited.unwatchInsert.call(this, query);
				this._store.remoteWatcher.unwatchInsert(query, this);
			}			
			
		};
	});
});
Scoped.define("module:Stores.RemoteStore", [
    "module:Stores.Invokers.InvokerStore",
    "module:Stores.Invokers.StoreInvokeeRestInvoker",
    "module:Stores.Invokers.RestInvokeeAjaxInvoker"
], function (Store, RestInvoker, AjaxInvoker, scoped) {
 	return Store.extend({scoped: scoped}, function (inherited) {
 		return {
 			
 			constructor: function (ajax, restOptions, storeOptions) {
 				var ajaxInvoker = new AjaxInvoker(ajax);
 				var restInvoker = new RestInvoker(ajaxInvoker, restOptions);
 				inherited.constructor.call(this, restInvoker, storeOptions);
 				this.auto_destroy(restInvoker);
 				this.auto_destroy(ajaxInvoker);
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



Scoped.define("module:Stores.Watchers.ConsumerWatcher", [
                                                         "module:Stores.Watchers.StoreWatcher"
                                                         ], function(StoreWatcher, scoped) {
	return StoreWatcher.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (sender, receiver, options) {
				inherited.constructor.call(this, options);
				this._receiver = receiver;
				this._sender = sender;
				receiver.on("receive", function (message, data) {
					if (message === "insert")
						this._insertedWatchedInsert(data);
					if (message === "update")
						this._updatedWatchedItem(data.row, data.data);
					else if (message === "remove")
						this._removedWatchedItem(data);
				}, this);
			},

			destroy: function () {
				this._receiver.off(null, null, this);
				inherited.destroy.apply(this);
			},

			_watchItem: function (id) {
				this._sender.send("watch_item", id);
			},

			_unwatchItem: function (id) {
				this._sender.send("unwatch_item", id);
			},

			_watchInsert: function (query) {
				this._sender.send("watch_insert", query);
			},

			_unwatchInsert: function (query) {
				this._sender.send("unwatch_insert", query);
			}

		};
	});
});


Scoped.define("module:Stores.Watchers.ProducerWatcher", [
                                                         "base:Class"
                                                         ], function(Class, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (sender, receiver, watcher) {
				inherited.constructor.apply(this);
				this._watcher = watcher;
				this._receiver = receiver;
				receiver.on("receive", function (message, data) {
					if (message === "watch_item")
						watcher.watchItem(data, this);
					else if (message === "unwatch_item")
						watcher.unwatchItem(data, this);
					else if (message === "watch_insert")
						watcher.watchInsert(data, this);
					else if (message === "unwatch_insert")
						watcher.unwatchInsert(data, this);
				}, this);
				watcher.on("insert", function (data) {
					sender.send("insert", data);
				}, this).on("update", function (row, data) {
					sender.send("update", {row: row, data: data});
				}, this).on("remove", function (id) {
					sender.send("remove", id);
				}, this);
			},

			destroy: function () {
				this._receiver.off(null, null, this);
				this._watcher.off(null, null, this);
				inherited.destroy.apply(this);
			}

		};
	});
});

Scoped.define("module:Stores.Watchers.ListWatcher", [
    "module:Stores.Watchers.StoreWatcher",
    "base:Objs"
], function(StoreWatcher, Objs, scoped) {
	return StoreWatcher.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (store, watchers, options) {
				options = options || {};
				options.id_key = store.id_key();
				this.__watchers = {};
				inherited.constructor.call(this, options);
				if (watchers)
					watchers.forEach(this.addWatcher, this);
			},

			addWatcher: function (watcher) {
				if (!this.__watchers[watcher.cid()]) {
					this.delegateEvents(["insert", "update", "remove"], watcher);
					this.itemsIterator().iterate(watcher.watchItem, watcher);
					this.insertsIterator().iterate(watcher.watchInsert, watcher);
                    this.__watchers[watcher.cid()] = watcher;
                }
                return this;
			},

            removeWatcher: function (watcher) {
                if (this.__watchers[watcher.cid()]) {
					watcher.off(null, null, this);
					this.itemsIterator().iterate(watcher.unwatchItem, watcher);
					this.insertsIterator().iterate(watcher.unwatchInsert, watcher);
                    delete this.__watchers[watcher.cid()];
                }
                return this;
            },

			getWatchers: function () {
				return Objs.values(this.__watchers);
			},

			__forEachWatcher: function (f, ctx) {
				Objs.iter(this.__watchers, f, ctx || this);
			},

			destroy: function () {
				this.__forEachWatcher(this.removeWatcher);
				inherited.destroy.apply(this);
			},
			
			_watchItem : function(id) {
				this.__forEachWatcher(function (watcher) {
					watcher.watchItem(id);
				});
			},

			_unwatchItem : function(id) {
				this.__forEachWatcher(function (watcher) {
					watcher.unwatchItem(id);
				});
			},

			_watchInsert : function(query) {
				this.__forEachWatcher(function (watcher) {
					watcher.watchInsert(query);
				});
			},

			_unwatchInsert : function(query) {
				this.__forEachWatcher(function (watcher) {
					watcher.unwatchInsert(query);
				});
			}

		};
	});
});

Scoped.define("module:Stores.Watchers.LocalWatcher", [
                                                      "module:Stores.Watchers.StoreWatcher"
                                                      ], function(StoreWatcher, scoped) {
	return StoreWatcher.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (store, options) {
				options = options || {};
				options.id_key = store.id_key();
				inherited.constructor.call(this, options);
				this._store = store;
				this._store.on("insert", function (data, ctx) {
					this._insertedInsert(data, ctx);
				}, this).on("update", function (row, data, ctx) {
					this._updatedItem(row, data, ctx);
				}, this).on("remove", function (id, ctx) {
					this._removedItem(id, ctx);
				}, this);
			},

			destroy: function () {
				this._store.off(null, null, this);
				inherited.destroy.apply(this);
			}

		};
	});
});

Scoped.define("module:Stores.Watchers.PollWatcher", [
                                                     "module:Stores.Watchers.StoreWatcher",
                                                     "base:Comparators",
                                                     "base:Objs",
                                                     "base:Timers.Timer"
                                                     ], function(StoreWatcher, Comparators, Objs, Timer, scoped) {
	return StoreWatcher.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (store, options) {
				options = options || {};
				options.id_key = store.id_key();
				inherited.constructor.call(this, options);
				this._store = store;
				this.__itemCache = {};
				this.__lastKey = null;
				this.__lastKeyIds = {};
				this.__insertsCount = 0;
				this.__increasingKey = options.increasing_key || this.id_key;
				this.__ignoreUpdates = options.ignore_updates;
				if (options.auto_poll) {
					this.auto_destroy(new Timer({
						fire: this.poll,
						context: this,
						start: true,
						delay: options.auto_poll
					}));
				}
			},

			_watchItem : function(id, context) {
				this.__itemCache[id] = {
					context: context,
					value: null
                };
			},

			_unwatchItem : function(id) {
				delete this.__itemCache[id];
			},

			_queryLastKey: function () {
				var sort = {};
				return this._store.query({}, {
					limit: 1,
					sort: Objs.objectBy(this.__increasingKey, -1)
				}).mapSuccess(function (iter) {
					var result = iter.hasNext() ? iter.next()[this.__increasingKey] : null;
					iter.destroy();
					return result;
				}, this).mapError(function () {
					return null;
				});
			},

			_watchInsert : function(query) {
				if (this.__insertsCount === 0) {
					this._queryLastKey().success(function (value) {
						this.__lastKey = value;
						this.__lastKeyIds = {};
					}, this);
				}
				this.__insertsCount++;
			},

			_unwatchInsert : function(query) {
				this.__insertsCount--;
				if (this.__insertsCount === 0)
					this.__lastKey = null;
			},

			poll: function () {
				if (!this.__ignoreUpdates) {
					Objs.iter(this.__itemCache, function (cached, id) {
						this._store.get(id, cached.context).success(function (data) {
							if (!data)
								this._removedItem(id);
							else {
								var updatable = cached.value && !Comparators.deepEqual(cached.value, data, -1);
                                cached.value = Objs.clone(data, 1);
								if (updatable)
									this._updatedItem(data, data);
							}
						}, this);
					}, this);
				}
				if (this.destroyed())
					return;
				if (this.__lastKey) {
					this.insertsIterator().iterate(function (q) {
						var query = q.query;
						var options = q.options;
						var keyQuery = Objs.objectBy(this.__increasingKey, {"$gte": this.__lastKey});
						this._store.query(Objs.extend(keyQuery, query), options).success(function (result) {
							while (result.hasNext()) {
								var item = result.next();
								var id = item[this.__increasingKey];
								if (!this.__lastKeyIds[id])
									this._insertedInsert(item);
								this.__lastKeyIds[id] = true;
								if (id > this.__lastKey)
									this.__lastKey = id; 
							}
							result.destroy();
						}, this);
					}, this);
				} else {
					this._queryLastKey().success(function (value) {
						if (value !== this.__lastKey) {
							this.__lastKey = value;
							this.__lastKeyIds = {};
						}
					}, this);
				}
			}

		};
	});
});

Scoped.define("module:Stores.Watchers.StoreWatcherMixin", [], function() {
	return {

		watchItem : function(id, context) {},

		unwatchItem : function(id, context) {},

		watchInsert : function(query, context) {},

		unwatchInsert : function(query, context) {},

		_removedWatchedItem : function(id) {
			this.trigger("remove", id);
		},

		_updatedWatchedItem : function(row, data) {
			this.trigger("update", row, data);
		},

		_insertedWatchedInsert : function(data) {
			this.trigger("insert", data);
		},
		
		delegateStoreEvents: function (store) {
			this.on("insert", function (data) {
				store.trigger("insert", data);
			}, store).on("update", function (row, data) {
				store.trigger("update", row, data);
			}, store).on("remove", function (id) {
				store.trigger("remove", id);
			}, store);
		},

		undelegateStoreEvents: function (store) {
			this.off(null, null, store);
		}

	};	
});


Scoped.define("module:Stores.Watchers.StoreWatcher", [
	"base:Class",
	"base:Events.EventsMixin",
	"base:Classes.ContextRegistry",
	"base:Comparators",
	"module:Stores.Watchers.StoreWatcherMixin",
	"module:Queries"
], function(Class, EventsMixin, ContextRegistry, Comparators, StoreWatcherMixin, Queries, scoped) {
	return Class.extend({scoped: scoped}, [EventsMixin, StoreWatcherMixin, function (inherited) {
		return {

			constructor: function (options) {
				inherited.constructor.call(this);
				options = options || {};
				if (options.id_key)
					this.id_key = options.id_key;
				else
					this.id_key = "id";
				this.__ctx = options.ctx;
				this.__items = new ContextRegistry();
				this.__inserts = new ContextRegistry(Queries.serialize, Queries);
			},

			destroy: function () {
				this.insertsIterator().iterate(this.unwatchInsert, this);
				this.itemsIterator().iterate(this.unwatchItem, this);
				this.__inserts.destroy();
				this.__items.destroy();
				inherited.destroy.call(this);
			},

			insertsIterator: function () {
				return this.__inserts.iterator();
			},

            itemsIterator: function () {
                return this.__items.iterator();
            },

			watchItem : function(id, context) {
				if (this.__items.register(id, context))
					this._watchItem(id);
			},

			unwatchItem : function(id, context) {
				this.__items.unregister(id, context).forEach(this._unwatchItem, this);
			},

			watchInsert : function(query, context) {
				if (this.__inserts.register(query, context))
					this._watchInsert(query);
			},

			unwatchInsert : function(query, context) {
				this.__inserts.unregister(query, context).forEach(this._unwatchInsert, this);
			},

			_ctxFilter: function (ctx) {
				return !this.__ctx || !ctx || Comparators.deepEqual(this.__ctx, ctx, 2);
			},

			_removedItem : function(id, ctx) {
				if (!this._ctxFilter(ctx))
					return;
				if (!this.__items.get(id))
					return;
				// @Oliver: I am not sure why this is commented out, but tests fail if we comment it in.
				// this.unwatchItem(id, null);
				this._removedWatchedItem(id);
			},

			_updatedItem : function(row, data, ctx) {
                if (!this._ctxFilter(ctx))
                    return;
				var id = row[this.id_key];
				if (!this.__items.get(id))
					return;
				this._updatedWatchedItem(row, data);
			},

			_insertedInsert : function(data, ctx) {
                if (!this._ctxFilter(ctx))
                    return;
				var trig = false;
				var iter = this.__inserts.iterator();
				while (!trig && iter.hasNext())
					trig = Queries.evaluate(iter.next().query, data);
				if (!trig)
					return;
				this._insertedWatchedInsert(data);
			},

			unregisterItem: function (id, context) {
				if (this.__items.unregister(id, context))
					this._unregisterItem(id);
			},			

			_watchItem : function(id) {},

			_unwatchItem : function(id) {},

			_watchInsert : function(query) {},

			_unwatchInsert : function(query) {},

			reconnect: function () {
                this.itemsIterator().iterate(this._watchItem, this);
                this.insertsIterator().iterate(this._watchInsert, this);
			}

		};
	}]);
});


Scoped.extend("module:Modelling.ActiveModel", [
    "base:Properties.Properties",
    "base:Async",
    "base:Objs",
    "module:Queries"
], function(Properties, Async, Objs, Queries, scoped) {
    return Properties.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(table, query, queryopts, options) {
                inherited.constructor.call(this);
                this._options = options || {};
                this._table = table;
                this._watcher = table.store().watcher();
                this._query = query;
                this._queryopts = queryopts || {};
                this.set("model", null);
                this._unregisterModel();
                if (this._watcher) {
                    this._watcher.watchInsert({
                        query: this._query,
                        options: Objs.extend({
                            limit: 1
                        }, this._queryopts)
                    }, this);
                }
                this._table.on("create", function(data) {
                    if (!Queries.evaluate(this._query, data))
                        return;
                    if (!this._queryopts.sort && this.get("model"))
                        return;
                    if (this.get("model"))
                        this._unregisterModel();
                    else
                        this._registerModel(this._table.materialize(data));
                }, this);
            },

            destroy: function() {
                if (this._watcher) {
                    this._watcher.unwatchInsert(null, this);
                    this._watcher.unwatchItem(null, this);
                }
                if (this.get("model"))
                    this.get("model").weakDestroy();
                this._table.off(null, null, this);
                inherited.destroy.call(this);
            },

            _watcher: function() {
                return this._table.store().watcher();
            },

            update: function(query) {
                this._query = query;
                if (!this.get("model") || !Properties.is_class_instance(this.get("model")) || !Queries.evaluate(this._query, this.get("model").data()))
                    this._unregisterModel();
            },

            _registerModel: function(model) {
                this.set("model", model);
                if (this._watcher && !model.isNew())
                    this._watcher.watchItem(model.id(), this);
                model.on("change", function() {
                    if (!Queries.evaluate(this._query, model.data()))
                        this._unregisterModel();
                }, this);
                model.on("remove", function() {
                    this._unregisterModel();
                }, this);
            },

            _unregisterModel: function() {
                var model = this.get("model");
                if (model && Properties.is_class_instance(model)) {
                    Async.eventually(function() {
                        model.weakDestroy();
                    });
                }
                if (this._watcher)
                    this._watcher.unwatchItem(null, this);
                this.set("model", null);
                this._table.findBy(this._query, this._queryopts).success(function(model) {
                    if (model)
                        this._registerModel(model);
                    else if (this._options.create_virtual)
                        this._registerModel(this._options.create_virtual.call(this._options.create_virtual_ctx || this, this._query));
                }, this);
            }

        };
    });
});
Scoped.define("module:Modelling.Associations.Association", [
    "base:Class"
], function(Class, scoped) {
    return Class.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(model, options) {
                inherited.constructor.call(this);
                this._model = model;
                this._options = options || {};
            }

        };
    });
});
Scoped.define("module:Modelling.Associations.BelongsToAssociation", [
    "module:Modelling.Associations.OneAssociation",
    "base:Objs"
], function(OneAssociation, Objs, scoped) {
    return OneAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function() {
                inherited.constructor.apply(this, arguments);
                this._model.on("change:" + this._foreign_key, this._queryChanged, this);
            },

            _buildQuery: function(query) {
                var result = this._model.get(this._foreign_key);
                if (this._options.map)
                    result = this._options.map.call(this._options.mapctx || this, result);
                return Objs.extend(Objs.objectBy(
                    this._options.foreign_attr || this._foreignTable().primary_key(),
                    result
                ), query);
            },

            _unset: function() {
                this._model.set(this._foreign_key, null);
            },

            _set: function(model) {
                this._model.set(this._foreign_key, model.id());
            }

        };
    });
});
Scoped.define("module:Modelling.Associations.HasManyAssociation", [
    "module:Modelling.Associations.TableAssociation",
    "base:Classes.SharedObjectFactory",
    "base:Classes.SharedObjectFactoryPool",
    "module:Collections.TableQueryCollection",
    "base:Objs",
    "base:Functions"
], function(TableAssociation, SharedObjectFactory, SharedObjectFactoryPool, TableQueryCollection, Objs, Functions, scoped) {
    return TableAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function() {
                inherited.constructor.apply(this, arguments);
                this.collection = this.newPooledCollection();
                this.collectionPool = new SharedObjectFactoryPool(this.newPooledCollection, this);
                if (this._model && this._model.isNew && this._model.isNew())
                    this._model.once("save", this._queryChanged, this);
            },

            destroy: function() {
                this.collectionPool.destroy();
                this.collection.destroy();
                if (this._model)
                    this._model.off(null, null, this);
                inherited.destroy.call(this);
            },

            customCollection: function() {
                return this.collectionPool.acquire.apply(this.collectionPool, arguments);
            },

            newPooledCollection: function() {
                var collection = new SharedObjectFactory(this.newCollection, this, Functions.getArguments(arguments));
                collection.add = Functions.as_method(this.add, this);
                collection.remove = Functions.as_method(this.remove, this);
                return collection;
            },

            _buildQuery: function(query, options) {},

            buildQuery: function(query, options) {
                return this._buildQuery(Objs.extend(query, this._options.query), Objs.extend(options, this._options.queryOpts));
            },

            _queryChanged: function() {
                var collection = this.collection.value();
                if (collection)
                    collection.update(this.buildQuery());
            },

            allBy: function(query, options) {
                var result = this.buildQuery(query, options);
                return this._foreignTable().allBy(result.query, result.options);
            },

            _queryCollectionUpdated: function(coll) {},

            newCollection: function(query, options) {
                var result = this.buildQuery(query, options);
                var coll = new TableQueryCollection(this._foreignTable(), result.query, Objs.extend(Objs.extend(result.options, this._options.collectionOptions), options));
                coll.on("replaced-objects collection-updated", function() {
                    this._queryCollectionUpdated(coll);
                }, this);
                this._queryCollectionUpdated(coll);
                return coll;
            },

            remove: function(item) {
                return this._remove(item);
            },

            _remove: function(item) {},

            add: function(item) {
                return this._add(item);
            },

            _add: function(item) {}

        };
    });
});
Scoped.define("module:Modelling.Associations.HasManyCustomAssociation", [
    "module:Modelling.Associations.HasManyAssociation",
    "base:Objs"
], function(HasManyAssociation, Objs, scoped) {
    return HasManyAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            _buildQuery: function(query, options) {
                return {
                    "query": this._foreign_key,
                    "options": Objs.clone(options || {}, 1)
                };
            }

        };
    });
});
Scoped.define("module:Modelling.Associations.HasManyInArrayAssociation", [
    "module:Modelling.Associations.HasManyAssociation",
    "base:Objs"
], function(HasManyAssociation, Objs, scoped) {
    return HasManyAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            _buildQuery: function(query, options) {
                return {
                    "query": Objs.objectBy(this._foreign_key, {
                        "$elemMatch": this._model.id()
                    })
                };
            },

            _remove: function(item) {
                item.set(this._foreign_key, item.get(this._foreign_key).filter(function(key) {
                    return key !== this._model.id();
                }, this));
            },

            _add: function(item) {
                var current = Objs.clone(item.get(this._foreign_key), 1);
                var exists = current.some(function(key) {
                    return key === this._model.id();
                }, this);
                if (!exists) {
                    current.push(this._model.id());
                    item.set(this._foreign_key, current);
                }
            }

        };
    });
});
Scoped.define("module:Modelling.Associations.HasManyKeyAssociation", [
    "module:Modelling.Associations.HasManyAssociation",
    "base:Objs"
], function(HasManyAssociation, Objs, scoped) {
    return HasManyAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            _buildQuery: function(query, options) {
                return {
                    "query": Objs.extend(Objs.objectBy(this._foreign_key, this._model.id()), query),
                    "options": options
                };
            },

            _remove: function(item) {
                item.set(this._foreign_key, null);
            },

            _add: function(item) {
                item.set(this._foreign_key, this._model.id());
            }

        };
    });
});
Scoped.define("module:Modelling.Associations.HasManyThroughArrayAssociation", [
    "module:Modelling.Associations.HasManyAssociation",
    "base:Objs",
    "base:Types",
    "base:Functions"
], function(HasManyAssociation, Objs, Types, Functions, scoped) {
    return HasManyAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            __foreignKeyArray: function() {
                return Types.is_array(this._foreign_key) ? this._foreign_key : [this._foreign_key];
            },

            __readForeignKey: function() {
                var result = [];
                this.__foreignKeyArray().forEach(function(fk) {
                    result = result.concat(this._model.get(fk) || []);
                }, this);
                return result;
            },

            constructor: function() {
                inherited.constructor.apply(this, arguments);
                this._options.collectionOptions = Objs.extend({
                    secondary_ident: Functions.as_method(this._mapItemValue, this)
                }, this._options.collectionOptions);
                this.__foreignKeyArray().forEach(function(fk) {
                    this._model.on("change:" + fk, this._queryChanged, this);
                }, this);
            },

            _buildQuery: function(query, options) {
                var arr = this.__readForeignKey();
                if (this._options.map)
                    arr = arr.map(this._options.map, this._options.mapctx || this);
                return {
                    "query": Objs.extend(Objs.objectBy(
                        this._options.foreign_attr || this._foreignTable().primary_key(), Objs.objectBy(
                            this._options.ignore_case ? "$inic" : "$in",
                            arr
                        )), query)
                };
            },

            _queryCollectionUpdated: function(coll) {
                if (this._options.create_virtual) {
                    this.__readForeignKey().filter(function(key) {
                        return !coll.has(function(item) {
                            return this._matchItem(item, key);
                        }, this);
                    }, this).forEach(function(key) {
                        coll.add(this._options.create_virtual.call(this._options.create_virtual_ctx || this, key));
                    }, this);
                }
            },

            _mapValue: function(value) {
                if (this._options.map)
                    value = this._options.map.call(this._options.mapctx || this, value);
                if (this._options.ignore_case)
                    value = value.toLowerCase();
                return value;
            },

            _mapItemValue: function(item) {
                return this._mapValue(item.get(this._options.foreign_attr || this._foreignTable().primary_key()));
            },

            _matchItem: function(item, key) {
                return this._mapItemValue(item) === this._mapValue(key);
            },

            _remove: function(item) {
                this.__foreignKeyArray().forEach(function(fk) {
                    this._model.set(fk, this._model.get(fk).filter(function(key) {
                        return !this._matchItem(item, key);
                    }, this));
                }, this);
                if (this._options.create_virtual && this.collection.value() && !item.destroyed())
                    this.collection.value().remove(item);
            },

            _add: function(item) {
                if (!this.__readForeignKey().some(function(key) {
                        return this._matchItem(item, key);
                    }, this)) {
                    var fk = Types.is_array(this._foreign_key) ? this._foreign_key[0] : this._foreign_key;
                    var current = Objs.clone(this._model.get(fk) || [], 1);
                    current.push(item.get(this._options.foreign_attr || this._foreignTable().primary_key()));
                    if (this._options.create_virtual && this.collection.value())
                        this.collection.value().add(item);
                    this._model.set(fk, current);
                }
            }

        };
    });
});
Scoped.define("module:Modelling.Associations.HasOneAssociation", [
    "module:Modelling.Associations.OneAssociation",
    "base:Objs"
], function(HasManyAssociation, Objs, scoped) {
    return HasManyAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            _buildQuery: function(query, options) {
                return Objs.objectBy(this._foreign_key, this._model.id());
            },

            _unset: function() {
                if (this.active.value() && this.active.value().get("model"))
                    this.active.value().get("model").set(this._foreign_key, null);
            },

            _set: function(model) {
                model.set(this._foreign_key, this._model.id());
                this._unset();
            }

        };
    });
});
Scoped.define("module:Modelling.Associations.OneAssociation", [
    "module:Modelling.Associations.TableAssociation",
    "base:Classes.SharedObjectFactory",
    "module:Modelling.ActiveModel",
    "base:Objs"
], function(TableAssociation, SharedObjectFactory, ActiveModel, Objs, scoped) {
    return TableAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function() {
                inherited.constructor.apply(this, arguments);
                this.active = new SharedObjectFactory(this.newActiveModel, this);
            },

            _buildQuery: function(query) {},

            buildQuery: function(query) {
                return this._buildQuery(Objs.extend(query, this._options.query));
            },

            _queryChanged: function() {
                var active = this.active.value();
                if (active)
                    active.update(this.buildQuery());
            },

            findBy: function(query, ctx) {
                var result = this.buildQuery(query);
                return this._foreignTable().findBy(result, null, ctx);
            },

            newActiveModel: function(query) {
                var result = this.buildQuery(query);
                return new ActiveModel(this._foreignTable(), result, this._options.queryOpts, this._options.activeOpts);
            },

            unset: function() {
                return this._unset();
            },

            _unset: function() {},

            set: function(model) {
                return this._set(model);
            },

            _set: function(model) {}

        };
    });
});
Scoped.define("module:Modelling.Associations.PolymorphicBelongsToAssociation", [
    "module:Modelling.Associations.BelongsToAssociation",
    "base:Objs"
], function(BelongsToAssociation, Objs, scoped) {
    return BelongsToAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(model, foreign_key, foreign_type_key, table_lookup_function, options) {
                inherited.constructor.call(this, model, null, foreign_key, options);
                this._foreign_type_key = foreign_type_key;
                this._table_lookup_function = table_lookup_function;
            },

            _foreignTable: function() {
                return this._table_lookup_function(this._model.get(this._foreign_type_key));
            },

            _unset: function() {
                inherited._unset.call(this);
                this._model.set(this._foreign_type_key, null);
            },

            _set: function(model) {
                inherited._set.call(this, model);
                this._model.set(this._foreign_type_key, model.type());
            }

        };
    });
});
Scoped.define("module:Modelling.Associations.PolymorphicHasManyKeyAssociation", [
    "module:Modelling.Associations.HasManyKeyAssociation",
    "base:Objs"
], function(HasManyKeyAssociation, Objs, scoped) {
    return HasManyKeyAssociation.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(model, foreign_table, foreign_key, foreign_type_key, options) {
                inherited.constructor.call(this, model, foreign_table, foreign_key, options);
                this._foreign_type_key = foreign_type_key;
            },

            _buildQuery: function(query, options) {
                return Objs.extend({
                    "query": Objs.extend(Objs.objectBy(
                        this._foreign_key,
                        this._model.id(),
                        this._foreign_type_key,
                        this._model.type()
                    ), query)
                }, options);
            },

            _remove: function(item) {
                inherited._remove.call(this, item);
                item.set(this._foreign_type_key, null);
            },

            _add: function(item) {
                inherited._add.call(this, item);
                item.set(this._foreign_type_key, this._model.type());
            }

        };
    });
});
Scoped.define("module:Modelling.Associations.TableAssociation", [
    "module:Modelling.Associations.Association"
], function(Association, scoped) {
    return Association.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(model, foreign_table, foreign_key, options) {
                inherited.constructor.call(this, model, options);
                this._foreign_table = foreign_table;
                this._foreign_key = foreign_key;
            },

            _foreignTable: function() {
                return this._foreign_table;
            }

        };
    });
});
Scoped.define("module:Modelling.ModelException", [
    "base:Exceptions.Exception"
], function(Exception, scoped) {
    return Exception.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(model, message) {
                inherited.constructor.call(this, message);
                this.__model = model;
            },

            model: function() {
                return this.__model;
            }

        };
    });
});


Scoped.define("module:Modelling.ModelMissingIdException", [
    "module:Modelling.ModelException"
], function(Exception, scoped) {
    return Exception.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(model) {
                inherited.constructor.call(this, model, "No id given.");
            }

        };
    });
});


Scoped.define("module:Modelling.ModelInvalidException", [
    "module:Modelling.ModelException",
    "base:Objs"
], function(Exception, Objs, scoped) {
    return Exception.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(model, err) {
                var message = Objs.values(model.errors()).join("\n") || err;
                inherited.constructor.call(this, model, message);
            }

        };
    });
});
Scoped.define("module:Modelling.GroupedProperties", [
    "module:Modelling.AssociatedProperties",
    "base:Objs",
    "base:Types",
    "base:Collections.Collection"
], function(AssociatedProperties, Objs, Types, Collection, scoped) {
    return AssociatedProperties.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(attributes, collection) {
                inherited.constructor.call(this, attributes);

                var silent = false;
                var items = collection || this.auto_destroy(new Collection());
                this[this.cls.groupedItemsKey] = items;
                this.set(this.cls.groupedItemsCount, items.count());
                items.on("add remove", function() {
                    this.set(this.cls.groupedItemsCount, items.count());
                }, this);

                /* Methods */
                Objs.extend(this, Objs.map(this.cls.groupedMethods, function(methodFunc, methodKey) {
                    if (Types.is_string(methodFunc))
                        methodFunc = this.cls.methodsHelper[methodFunc];
                    return function() {
                        return methodFunc(items, methodKey, arguments);
                    };
                }, this));

                /* Setter */
                Objs.iter(this.cls.groupedSetters, function(setterFunc, attrKey) {
                    if (Types.is_string(setterFunc))
                        setterFunc = this.cls.settersHelper[setterFunc];
                    this.on("change:" + attrKey, function(attrValue) {
                        if (silent)
                            return;
                        setterFunc(items, attrKey, attrValue);
                    });
                }, this);

                /* Getter */
                Objs.iter(this.cls.groupedGetters, function(metaAttr, attrKey) {
                    if (Types.is_string(metaAttr)) {
                        if (!this.cls.gettersHelper[metaAttr]) {
                            console.warn("Unknown Getter: " + metaAttr);
                            return;
                        }
                        metaAttr = this.cls.gettersHelper[metaAttr];
                    }
                    var groupValue = null;
                    if (metaAttr.add) {
                        this.on("items:add", function(item) {
                            groupValue = metaAttr.add(groupValue, item.get(attrKey), item);
                            silent = true;
                            this.set(attrKey, metaAttr.map ? metaAttr.map(groupValue) : groupValue);
                            silent = false;
                        }, this);
                    }
                    if (metaAttr.remove) {
                        this.on("items:remove", function(item) {
                            groupValue = metaAttr.remove(groupValue, item.get(attrKey), item);
                            silent = true;
                            this.set(attrKey, metaAttr.map ? metaAttr.map(groupValue) : groupValue);
                            silent = false;
                        }, this);
                    }
                    if (metaAttr.update) {
                        items.on("change:" + attrKey, function(item, newValue, oldValue) {
                            groupValue = metaAttr.update(groupValue, newValue, oldValue, items.getIndex(item), items.count(), item);
                            silent = true;
                            this.set(attrKey, metaAttr.map ? metaAttr.map(groupValue) : groupValue);
                            silent = false;
                        }, this);
                    }
                    if (metaAttr.first) {
                        this.on("items:add items:reindexed", function(item) {
                            if (items.getIndex(item) === 0)
                                groupValue = metaAttr.first(groupValue, item.get(attrKey));
                            silent = true;
                            this.set(attrKey, metaAttr.map ? metaAttr.map(groupValue) : groupValue);
                            silent = false;
                        }, this);
                    }
                    if (metaAttr.last) {
                        this.on("items:add items:reindexed", function(item) {
                            if (items.getIndex(item) === items.count() - 1)
                                groupValue = metaAttr.last(groupValue, item.get(attrKey));
                            silent = true;
                            this.set(attrKey, metaAttr.map ? metaAttr.map(groupValue) : groupValue);
                            silent = false;
                        }, this);
                    }
                }, this);

                items.iterate(function(item) {
                    this.trigger("items:add", item);
                }, this);
                this.delegateEvents([
                    "add", "remove", "reindexed"
                ], items, "items");
            },

            destroy: function() {
                this[this.cls.groupedItemsKey].off(null, null, this);
                inherited.destroy.call(this);
            }

        };
    }, {

        groupedItemsKey: "items",
        groupedItemsCount: "count",

        groupedMethods: {},
        groupedSetters: {},
        groupedGetters: {},

        methodsHelper: {
            all: function(items, methodName, methodArgs) {
                var result = null;
                items.iterate(function(item) {
                    result = item[methodName].apply(item, methodArgs) || result;
                });
                return result;
            },
            first: function(items, methodName, methodArgs) {
                var item = items.first();
                return item ? item[methodName].apply(item, methodArgs) : undefined;
            },
            last: function(items, methodName, methodArgs) {
                var item = items.last();
                return item ? item[methodName].apply(item, methodArgs) : undefined;
            }
        },

        settersHelper: {
            all: function(items, attrKey, attrValue) {
                items.iterate(function(item) {
                    item.set(attrKey, attrValue);
                });
            },
            first: function(items, attrKey, attrValue) {
                var item = items.first();
                if (item)
                    item.set(attrKey, attrValue);
            },
            last: function(items, attrKey, attrValue) {
                var item = items.last();
                if (item)
                    item.set(attrKey, attrValue);
            }
        },

        gettersHelper: {
            exists: {
                add: function(groupValue, itemValue) {
                    return (groupValue || 0) + (itemValue ? 1 : 0);
                },
                remove: function(groupValue, itemValue) {
                    return (groupValue || 0) - (itemValue ? 1 : 0);
                },
                update: function(groupValue, newItemValue, oldItemValue) {
                    return (groupValue || 0) - (oldItemValue ? 1 : 0) + (newItemValue ? 1 : 0);
                },
                map: function(groupValue) {
                    return !!groupValue;
                }
            },
            all: {
                add: function(groupValue, itemValue) {
                    return (groupValue || 0) + (itemValue ? 0 : 1);
                },
                remove: function(groupValue, itemValue) {
                    return (groupValue || 0) - (itemValue ? 0 : 1);
                },
                update: function(groupValue, newItemValue, oldItemValue) {
                    return (groupValue || 0) - (oldItemValue ? 0 : 1) + (newItemValue ? 0 : 1);
                },
                map: function(groupValue) {
                    return !groupValue;
                }
            },
            first: {
                first: function(groupValue, itemValue) {
                    return itemValue;
                },
                update: function(groupValue, newItemValue, oldItemValue, itemIndex) {
                    return itemIndex === 0 ? newItemValue : groupValue;
                }
            },
            last: {
                last: function(groupValue, itemValue) {
                    return itemValue;
                },
                update: function(groupValue, newItemValue, oldItemValue, itemIndex, itemCount) {
                    return itemIndex === itemCount - 1 ? newItemValue : groupValue;
                }
            },
            uniqueUnion: {
                add: function(groupValue, itemValue, item) {
                    var result = Objs.clone(groupValue || {}, 1);
                    if (!itemValue || !Types.is_array(itemValue))
                        itemValue = [];
                    itemValue.forEach(function(key) {
                        result[key] = result[key] || {};
                        result[key][item.cid()] = true;
                    });
                    return result;
                },
                remove: function(groupValue, itemValue, item) {
                    var result = Objs.clone(groupValue || {}, 1);
                    if (!itemValue || !Types.is_array(itemValue))
                        itemValue = [];
                    itemValue.forEach(function(key) {
                        if (result[key]) {
                            delete result[key][item.cid()];
                            if (Types.is_empty(result[key]))
                                delete result[key];
                        }
                    });
                    return result;
                },
                update: function(groupValue, newItemValue, oldItemValue, itemIndex, itemCount, item) {
                    var result = Objs.clone(groupValue || {}, 1);
                    (oldItemValue || []).forEach(function(key) {
                        if (result[key]) {
                            delete result[key][item.cid()];
                            if (Types.is_empty(result[key]))
                                delete result[key];
                        }
                    });
                    (newItemValue || []).forEach(function(key) {
                        result[key] = result[key] || {};
                        result[key][item.cid()] = true;
                    });
                    return result;
                },
                map: function(groupValue) {
                    return Objs.keys(groupValue);
                }
            }
        }

    });
});
Scoped.define("module:Modelling.Model", [
    "module:Modelling.AssociatedProperties",
    "module:Modelling.ModelInvalidException",
    "base:Objs",
    "base:Promise",
    "base:Types",
    "base:Strings",
    "module:Modelling.Table"
], function(AssociatedProperties, ModelInvalidException, Objs, Promise, Types, Strings, Table, scoped) {
    return AssociatedProperties.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(attributes, table, options, ctx) {
                this.__table = table;
                this.__options = Objs.extend({
                    newModel: true,
                    removed: false
                }, options);
                this.__ctx = ctx;
                this.__silent = 1;
                inherited.constructor.call(this, attributes);
                this.__silent = 0;
                this.__removeOnDestroy = false;
                if (!this.isNew()) {
                    this._properties_changed = {};
                    this._registerEvents();
                }
                if (this.option("auto_create") && this.isNew())
                    this.save();
            },

            destroy: function() {
                if (this.__removeOnDestroy)
                    this.remove();
                if (this.table())
                    this.table().off(null, null, this);
                this.trigger("destroy");
                inherited.destroy.call(this);
            },

            ctx: function() {
                return this.__ctx;
            },

            saveOnChange: function(weak) {
                this.__saveOnChange = true;
                this.__saveOnChangeWeak = !!weak;
                return this;
            },

            option: function(key) {
                var opts = key in this.__options || !this.table() ? this.__options : this.table().options();
                return opts[key];
            },

            type: function() {
                return this.cls.type();
            },

            table: function() {
                return this.__table;
            },

            isSaved: function() {
                return this.isRemoved() || (!this.isNew() && !this.isChanged());
            },

            isNew: function() {
                return this.option("newModel");
            },

            isRemoved: function() {
                return this.option("removed");
            },

            _registerEvents: function() {
                this.__table.on("update:" + this.id(), function(data) {
                    if (this.isRemoved())
                        return;
                    this.__silent++;
                    for (var key in data) {
                        if (!this._properties_changed[key]) {
                            this.set(key, data[key]);
                            delete this._properties_changed[key];
                        }
                    }
                    this.__silent--;
                }, this);
                this.__table.on("remove:" + this.id(), function() {
                    if (this.isRemoved())
                        return;
                    this.trigger("remove");
                    this.__options.removed = true;
                }, this);
            },

            update: function(data) {
                this.__silent++;
                this.suspendEvents();
                this.setAll(data);
                this.__silent--;
                var promise = this.isNew() ? Promise.create(true) : this.save();
                return promise.callback(this.resumeEvents, this);
            },

            _afterSet: function(key, value, old_value, options) {
                inherited._afterSet.call(this, key, value, old_value, options);
                var scheme = this.cls.scheme();
                if (!(key in scheme) || this.__silent > 0)
                    return;
                if (this.option("auto_update") && (!this.isNew() || (this.__saveOnChange && (!this.__saveOnChangeWeak || !!value))))
                    this.save();
            },

            save: function() {
                if (this.isRemoved())
                    return Promise.create({});
                var promise = this.option("save_invalid") ? Promise.value(true) : this.validate();
                return promise.mapSuccess(function(valid) {
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
                    var promise = this.isNew() ? this.__table.store().insert(attrs, this.__ctx) : this.__table.store().update(this.id(), attrs, this.__ctx);
                    return promise.mapCallback(function(err, result) {
                        if (this.destroyed())
                            return this;
                        if (err) {
                            if (err.data) {
                                Objs.iter(err.data, function(value, key) {
                                    this.setError(key, value);
                                }, this);
                            }
                            return new ModelInvalidException(this, err);
                        }
                        this.__silent++;
                        this.setAll(result);
                        this.__silent--;
                        this._properties_changed = {};
                        this.trigger("save");
                        if (wasNew) {
                            this.__options.newModel = false;
                            this._registerEvents();
                            this._createdModel();
                        }
                        return this;
                    }, this);
                }, this);
            },

            _createdModel: function() {},

            isRemoving: function() {
                return this.__removing;
            },

            remove: function() {
                if (this.isNew() || this.isRemoved())
                    return Promise.create(true);
                this.__removing = true;
                return this.__table.store().remove(this.id(), this.__ctx).callback(function() {
                    this.__removing = false;
                }, this).success(function() {
                    if (this.destroyed())
                        return;
                    this.__options.removed = true;
                    this.trigger("remove");
                }, this);
            },

            removeOnDestroy: function() {
                this.__removeOnDestroy = true;
                return this;
            }

        };
    }, {

        type: function() {
            return Strings.last_after(this.classname, ".").toLowerCase();
        },

        createTable: function(store, options) {
            return new Table(store, this, options);
        }

    });
});
Scoped.define("module:Modelling.SchemedProperties", [
    "base:Properties.Properties",
    "base:Types",
    "base:Promise",
    "base:Objs"
], function(Properties, Types, Promise, Objs, scoped) {
    return Properties.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(attributes) {
                inherited.constructor.call(this);
                var scheme = this.cls.scheme();
                this._properties_changed = {};
                this.__errors = {};
                for (var key in scheme) {
                    if ("def" in scheme[key])
                        this.set(key, Types.is_function(scheme[key].def) ? scheme[key].def(attributes) : scheme[key].def);
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

            _unsetChanged: function(key) {
                delete this._properties_changed[key];
            },

            _beforeSet: function(key, value) {
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

            _afterSet: function(key, value) {
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

            isChanged: function() {
                return !Types.is_empty(this._properties_changed);
            },

            properties_changed: function() {
                return this._properties_changed;
            },

            get_all_properties: function() {
                var result = {};
                var scheme = this.cls.scheme();
                for (var key in scheme)
                    result[key] = this.get(key);
                return result;
            },

            validate: function() {
                this.trigger("validate");
                var promises = [];
                for (var key in this.cls.scheme())
                    promises.push(this._validateAttr(key));
                promises.push(Promise.box(this._customValidate, this));
                return Promise.and(promises).end().mapSuccess(function(arr) {
                    var valid = true;
                    Objs.iter(arr, function(entry) {
                        valid = valid && entry;
                    });
                    return valid;
                });
            },

            _customValidate: function() {
                return true;
            },

            _validateAttr: function(attr) {
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
                Objs.iter(validate, function(validator) {
                    promises.push(Promise.box(validator.validate, validator, [value, this, attr]));
                }, this);
                return Promise.and(promises).end().mapSuccess(function(arr) {
                    var valid = true;
                    Objs.iter(arr, function(entry) {
                        if (entry !== null) {
                            valid = false;
                            this.__errors[attr] = entry;
                        }
                    }, this);
                    this.trigger("validate:" + attr, valid, this.__errors[attr]);
                    return valid;
                }, this);
            },

            setError: function(attr, error) {
                this.__errors[attr] = error;
                this.trigger("validate:" + attr, !(attr in this.__errors), this.__errors[attr]);
            },

            errors: function() {
                return this.__errors;
            },

            getError: function(attr) {
                return this.__errors[attr];
            },

            asRecord: function(tags) {
                var rec = {};
                var scheme = this.cls.scheme();
                var props = this.get_all_properties();
                tags = tags || [];
                var asInner = function(key) {
                    var target = scheme[key].tags || [];
                    var tarobj = {};
                    Objs.iter(target, function(value) {
                        tarobj[value] = true;
                    });
                    var success = true;
                    Objs.iter(tags, function(x) {
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

            setByTags: function(data, tags) {
                var scheme = this.cls.scheme();
                tags = tags || {};
                var setInner = function(key) {
                    var target = scheme[key].tags || [];
                    var tarobj = {};
                    Objs.iter(target, function(value) {
                        tarobj[value] = true;
                    });
                    var success = true;
                    Objs.iter(tags, function(x) {
                        success = success && x in tarobj;
                    }, this);
                    if (success)
                        this.set(key, data[key]);
                };
                for (var key in data)
                    if (key in scheme)
                        setInner.call(this, key);
            }

        };
    }, {

        _initializeScheme: function() {
            return {};
        },

        asRecords: function(arr, tags) {
            return arr.map(function(item) {
                return item.asRecord(tags);
            });
        },

        filterPersistent: function(obj) {
            var result = {};
            var scheme = this.scheme();
            for (var key in obj) {
                if ((!Types.is_defined(scheme[key].persistent) || scheme[key].persistent) && (Types.is_defined(obj[key])))
                    result[key] = obj[key];
            }
            return result;
        }

    }, {

        scheme: function() {
            this.__scheme = this.__scheme || this._initializeScheme();
            return this.__scheme;
        }

    });
});


Scoped.define("module:Modelling.AssociatedProperties", [
    "module:Modelling.SchemedProperties"
], function(SchemedProperties, scoped) {
    return SchemedProperties.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(attributes) {
                inherited.constructor.call(this, attributes);
                this.assocs = this._initializeAssociations();
            },

            _initializeAssociations: function() {
                return {};
            },

            destroy: function() {
                for (var key in this.assocs)
                    this.assocs[key].destroy();
                inherited.destroy.call(this);
            },

            id: function() {
                return this.get(this.cls.primary_key());
            },

            pid: function() {
                return this.id();
            },

            hasId: function() {
                return this.has(this.cls.primary_key());
            }

        };

    }, {

        primary_key: function() {
            return "id";
        },

        _initializeScheme: function() {
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
    "base:Iterators.MappedIterator",
    "base:Classes.ObjectCache"
], function(Class, EventsMixin, Objs, Types, MappedIterator, ObjectCache, scoped) {
    return Class.extend({
        scoped: scoped
    }, [EventsMixin, function(inherited) {
        return {

            constructor: function(store, model_type, options) {
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
                    save_invalid: false,
                    // Cache Models
                    cache_models: false
                }, options || {});
                this.__store.on("insert", function(obj) {
                    this.trigger("create", obj);
                }, this);
                this.__store.on("update", function(row, data) {
                    var id = row[this.primary_key()];
                    this.trigger("update", id, data, row);
                    this.trigger("update:" + id, data);
                }, this);
                this.__store.on("remove", function(id, ctx, data) {
                    this.trigger("remove", id, ctx, data);
                    this.trigger("remove:" + id, ctx, data);
                }, this);
                if (this.__options.cache_models) {
                    this.model_cache = this.auto_destroy(new ObjectCache(function(model) {
                        return model.id();
                    }));
                }
            },

            modelClass: function(cls) {
                cls = cls || this.__model_type;
                return Types.is_string(cls) ? Scoped.getGlobal(cls) : cls;
            },

            newModel: function(attributes, cls, ctx) {
                cls = this.modelClass(cls);
                var model = new cls(attributes, this, {}, ctx);
                if (this.__options.auto_create)
                    model.save();
                if (this.model_cache) {
                    if (model.hasId())
                        this.model_cache.register(model);
                    else {
                        model.once("save", function() {
                            this.model_cache.register(model);
                        }, this);
                    }
                }
                return model;
            },

            materialize: function(obj, ctx) {
                if (!obj)
                    return null;
                var cls = this.modelClass(this.__options.type_column && obj[this.__options.type_column] ? this.__options.type_column : null);
                if (this.model_cache) {
                    var cachedModel = this.model_cache.get(obj[this.primary_key()]);
                    if (cachedModel) {
                        cachedModel.setAll(obj);
                        return cachedModel;
                    }
                }
                var model = new cls(obj, this, {
                    newModel: false
                }, ctx);
                if (this.model_cache)
                    this.model_cache.register(model);
                return model;
            },

            options: function() {
                return this.__options;
            },

            store: function() {
                return this.__store;
            },

            findById: function(id, ctx) {
                return this.__store.get(id, ctx).mapSuccess(function(obj) {
                    return this.materialize(obj, ctx);
                }, this);
            },

            findBy: function(query, options, ctx) {
                return this.allBy(query, Objs.extend({
                    limit: 1
                }, options), ctx).mapSuccess(function(iter) {
                    var item = iter.next();
                    iter.destroy();
                    return item;
                });
            },

            allBy: function(query, options, ctx) {
                return this.__store.query(query, options, ctx).mapSuccess(function(iterator) {
                    return (new MappedIterator(iterator, function(obj) {
                        return this.materialize(obj, ctx);
                    }, this)).auto_destroy(iterator, true);
                }, this);
            },

            primary_key: function() {
                return (Types.is_string(this.__model_type) ? Scoped.getGlobal(this.__model_type) : this.__model_type).primary_key();
            },

            all: function(options, ctx) {
                return this.allBy({}, options, ctx);
            },

            query: function() {
                // Alias
                return this.allBy.apply(this, arguments);
            },

            scheme: function() {
                return this.__model_type.scheme();
            },

            ensure_indices: function() {
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
Scoped.define("module:Modelling.Validators.ConditionalValidator", [
    "module:Modelling.Validators.Validator",
    "base:Types"
], function(Validator, Types, scoped) {
    return Validator.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(condition, validator) {
                inherited.constructor.call(this);
                this.__condition = condition;
                this.__validator = Types.is_array(validator) ? validator : [validator];
            },

            validate: function(value, context) {
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
], function(Validator, Strings, scoped) {
    return Validator.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(error_string) {
                inherited.constructor.call(this);
                this.__error_string = error_string ? error_string : "Not a valid email address";
            },

            validate: function(value, context) {
                return Strings.is_email_address(value) ? null : this.__error_string;
            }

        };
    });
});
Scoped.define("module:Modelling.Validators.LengthValidator", [
    "module:Modelling.Validators.Validator",
    "base:Types",
    "base:Objs"
], function(Validator, Types, Objs, scoped) {
    return Validator.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(options) {
                inherited.constructor.call(this);
                options = Objs.extend({
                    min_length: null,
                    max_length: null,
                    error_string: null,
                    max_action: null
                }, options);
                this.__min_length = options.min_length;
                this.__max_length = options.max_length;
                this.__error_string = options.error_string;
                this.__max_action = options.max_action;
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

            validate: function(value, context, key) {
                if (this.__min_length !== null && (!value || (value && value.length < this.__min_length)))
                    return this.__error_string;
                var resp = null;
                if (this.__max_length !== null && (value && (value.length > this.__max_length))) {
                    resp = this.__error_string;
                    if (this.__max_action) {
                        switch (this.__max_action) {
                            case "truncate":
                                context.set(key, value.substr(0, this.__max_length));
                                resp = null;
                                break;
                            case "empty":
                                context.set(key, "");
                                resp = null;
                                break;
                            default:
                                break;
                        }
                    }
                }
                return resp;
            }

        };
    });
});
Scoped.define("module:Modelling.Validators.PresentValidator", [
    "module:Modelling.Validators.Validator",
    "base:Types"
], function(Validator, Types, scoped) {
    return Validator.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(error_string) {
                inherited.constructor.call(this);
                this.__error_string = error_string ? error_string : "Field is required";
            },

            validate: function(value, context) {
                return Types.is_null(value) || value === "" ? this.__error_string : null;
            }

        };
    });
});
Scoped.define("module:Modelling.Validators.UniqueValidator", [
    "module:Modelling.Validators.Validator"
], function(Validator, scoped) {
    return Validator.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(key, error_string) {
                inherited.constructor.call(this);
                this.__key = key;
                this.__error_string = error_string ? error_string : "Key already present";
            },

            validate: function(value, context) {
                var query = {};
                query[this.__key] = value;
                return context.table().findBy(query).mapSuccess(function(item) {
                    return (!item || (!context.isNew() && context.id() == item.id())) ? null : this.__error_string;
                }, this);
            }

        };
    });
});
Scoped.define("module:Modelling.Validators.Validator", [
    "base:Class"
], function(Class, scoped) {
    return Class.extend({
        scoped: scoped
    }, {

        validate: function(value, context) {
            return null;
        }

    });
});
}).call(Scoped);