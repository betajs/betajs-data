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
        "$le": {
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
         * condition :== $in: atoms | $gt: atom | $lt: atom | $gte: atom | $le: atom | $sw: atom | $ct: atom | all with ic
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
            return meta && (meta.target === "atoms" ? this.validate_atoms(value) : this.validate_atom(value));
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
            }
            return rec.evaluate_single.call(this, object_value, condition_value);
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