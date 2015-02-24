Scoped.define("module:Queries", [
        "json:",
	    "base:Types",
	    "base:Sort",
	    "base:Objs",
	    "base:Class",
	    "base:Iterators.ArrayIterator",
	    "base:Iterators.FilteredIterator"
	], function (JSON, Types, Sort, Objs, Class, ArrayIterator, FilteredIterator) {
	return {		
		
		/*
		 * Syntax:
		 *
		 * queries :== [query, ...]
		 * simples :== [simple, ...]
		 * query :== {pair, ...}
		 * pair :== string: value | $or : queries | $and: queries
		 * value :== simple | {condition, ...}  
		 * condition :== $in: simples | $gt: simple | $lt: simple | $gte: simple | $le: simple | $sw: simple | $gtic: simple | $ltic: simple | $geic: simple | $leic: simple | $swic: simple | $ct: simple | $ctic: simple
		 *
		 */
		
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
		
		normalize: function (query) {
			return Sort.deep_sort(query);
		},
		
		serialize: function (query) {
			return JSON.stringify(this.normalize(query));
		},
		
		unserialize: function (query) {
			return JSON.parse(query);
		},
		
		__increase_dependency: function (key, dep) {
			if (key in dep)
				dep[key]++;
			else
				dep[key] = 1;
			return dep;		
		},
		
		__dependencies_queries: function (queries, dep) {
			Objs.iter(queries, function (query) {
				dep = this.__dependencies_query(query, dep);
			}, this);
			return dep;
		},
		
		__dependencies_query: function (query, dep) {
			for (key in query)
				dep = this.__dependencies_pair(key, query[key], dep);
			return dep;
		},
		
		__dependencies_pair: function (key, value, dep) {
			if (key == "$or" || key == "$and")
				return this.__dependencies_queries(value, dep);
			else
				return this.__increase_dependency(key, dep);
		},
	
		dependencies : function(query) {
			return this.__dependencies_query(query, {});
		},
			
		__evaluate_query: function (query, object) {
			for (var key in query) {
				if (!this.__evaluate_pair(key, query[key], object))
					return false;
			}
			return true;
		},
		
		__evaluate_pair: function (key, value, object) {
			if (key == "$or")
				return this.__evaluate_or(value, object);
			if (key == "$and")
				return this.__evaluate_and(value, object);
			return this.__evaluate_value(value, object[key]);
		},
		
		__evaluate_value: function (value, object_value) {
			if (Types.is_object(value)) {
				var result = true;
				Objs.iter(value, function (tar, op) {
					if (op == "$in")
						result = result && Objs.contains_value(tar, object_value);
					if (op == "$gt")
						result = result && object_value > tar;
					if (op == "$gtic")
						result = result && object_value.toLowerCase() > tar.toLowerCase();
					if (op == "$lt")
						result = result && object_value < tar;
					if (op == "$ltic")
						result = result && object_value.toLowerCase() < tar.toLowerCase();
					if (op == "$gte")
						result = result && object_value >= tar;
					if (op == "$geic")
						result = result && object_value.toLowerCase() >= tar.toLowerCase();
					if (op == "$le")
						result = result && object_value <= tar;
					if (op == "$leic")
						result = result && object_value.toLowerCase() <= tar.toLowerCase();
					if (op == "$sw")
						result = result && object_value.indexOf(tar) === 0;
					if (op == "$swic")
						result = result && object_value.toLowerCase().indexOf(tar.toLowerCase()) === 0;
					if (op == "$ct")
						result = result && object_value.indexOf(tar) >= 0;
					if (op == "$ctic")
						result = result && object_value.toLowerCase().indexOf(tar.toLowerCase()) >= 0;
				}, this);
				return result;
			}
			return value == object_value;
		},
		
		__evaluate_or: function (arr, object) {
			var result = false;
			Objs.iter(arr, function (query) {
				if (this.__evaluate_query(query, object)) {
					result = true;
					return false;
				}
			}, this);
			return result;
		},
		
		__evaluate_and: function (arr, object) {
			var result = true;
			Objs.iter(arr, function (query) {
				if (!this.__evaluate_query(query, object)) {
					result = false;
					return false;
				}
			}, this);
			return result;
		},
		
		format: function (query) {
			if (Class.is_class_instance(query))
				return query.format();
			return JSON.stringify(query);
		},
		
		overloaded_evaluate: function (query, object) {
			if (Class.is_class_instance(query))
				return query.evaluate(object);
			if (Types.is_function(query))
				return query(object);
			return this.evaluate(query, object);
		},
		
		evaluate : function(query, object) {
			return this.__evaluate_query(query, object);
		},
	/*
		__compile : function(query) {
			if (Types.is_array(query)) {
				if (query.length == 0)
					throw "Malformed Query";
				var op = query[0];
				if (op == "Or") {
					var s = "false";
					for (var i = 1; i < query.length; ++i)
						s += " || (" + this.__compile(query[i]) + ")";
					return s;
				} else if (op == "And") {
					var s = "true";
					for (var i = 1; i < query.length; ++i)
						s += " && (" + this.__compile(query[i]) + ")";
					return s;
				} else {
					if (query.length != 3)
						throw "Malformed Query";
					var key = query[1];
					var value = query[2];
					var left = "object['" + key + "']";
					var right = Types.is_string(value) ? "'" + value + "'" : value;
					return left + " " + op + " " + right;
				}
			} else if (Types.is_object(query)) {
				var s = "true";
				for (key in query)
					s += " && (object['" + key + "'] == " + (Types.is_string(query[key]) ? "'" + query[key] + "'" : query[key]) + ")";
				return s;
			} else
				throw "Malformed Query";
		},
	
		compile : function(query) {
			var result = this.__compile(query);
			var func = new Function('object', result);
			var func_call = function(data) {
				return func.call(this, data);
			};
			func_call.source = 'function(object){\n return ' + result + '; }';
			return func_call;		
		},
	*/	
		emulate: function (query, query_function, query_context) {
			var raw = query_function.apply(query_context || this, {});
			var iter = raw;
			if (!raw)
				iter = new ArrayIterator([]);
			else if (Types.is_array(raw))
				iter = new ArrayIterator(raw);		
			return new FilteredIterator(iter, function(row) {
				return this.evaluate(query, row);
			}, this);
		}	
		
	}; 
});