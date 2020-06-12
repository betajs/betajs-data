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
        "$eq": {
            target: "atom",
            evaluate_single: function(object_value, condition_value) {
                return object_value === condition_value;
            }
        },
        "$ne": {
            target: "atom",
            evaluate_single: function(object_value, condition_value) {
                return object_value !== condition_value;
            }
        },
        "$regex": {
            target: "atom",
            evaluate_single: function(object_value, condition_value, all_conditions) {
                return Strings.cachedRegExp(condition_value, all_conditions.$options).test(object_value);
            }
        },
        "$options": {
            target: "atom",
            evaluate_single: function(object_value, condition_value) {
                return true;
            }
        },
        "$elemMatch": {
            target: "query",
            no_index_support: true,
            evaluate_combine: Objs.exists
        }
    };


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
         * condition :== $in: atoms | $gt: atom | $lt: atom | $gte: atom | $lte: atom | $regex: atom | $elemMatch
         *
         */

        SYNTAX_PAIR_KEYS: SYNTAX_PAIR_KEYS,

        SYNTAX_CONDITION_KEYS: SYNTAX_CONDITION_KEYS,

        isEqualValueKey: function(query, key) {
            return query && (key in query) && this.is_simple_atom(query[key]);
        },

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

        is_simple_atom: function(value) {
            return value === null || !Types.is_object(value) || value.toString() !== "[object Object]";
        },

        is_query_atom: function(value) {
            return this.is_simple_atom(value) || Objs.all(value, function(v, key) {
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
            else if (meta.target === "query")
                return this.validate_query(value, capabilities);
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
                return this.evaluate_key_value(value, key, object);
        },

        evaluate_key_value: function(value, key, object) {
            var i = key.indexOf(".");
            return i >= 0 ? this.evaluate_key_value(value, key.substring(i + 1), object[key.substring(0, i)]) : this.evaluate_value(value, object[key]);
        },

        evaluate_value: function(value, object_value) {
            return !this.is_query_atom(value) ? this.evaluate_conditions(value, object_value) : this.evaluate_atom(value, object_value);
        },

        evaluate_atom: function(value, object_value) {
            return value === object_value;
        },

        evaluate_conditions: function(value, object_value) {
            return Objs.all(value, function(condition_value, condition_key) {
                return this.evaluate_condition(condition_value, condition_key, object_value, value);
            }, this);
        },

        evaluate_condition: function(condition_value, condition_key, object_value, all_conditions) {
            var rec = this.SYNTAX_CONDITION_KEYS[condition_key];
            if (rec.target === "atoms") {
                return rec.evaluate_combine.call(Objs, condition_value, function(condition_single_value) {
                    return rec.evaluate_single.call(this, object_value, condition_single_value, all_conditions);
                }, this);
            } else if (rec.target === "atom")
                return rec.evaluate_single.call(this, object_value, condition_value, all_conditions);
            else if (rec.target === "query") {
                return rec.evaluate_combine.call(Objs, object_value, function(object_single_value) {
                    /*
                     * This fixes the case {value: foo}, {value: bar} where both foo and bar are objects.
                     * I am assuming that the actual fix would be to make queries work with sub queries...
                     */
                    return Types.is_object(condition_value) && Types.is_object(object_single_value) ?
                        this.evaluate_query(condition_value, object_single_value) :
                        this.evaluate_query({
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
                } else if (Types.is_object(value) && value !== null) {
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
                    if (lt !== null)
                        result[(lte ? "$lte" : "$lt") + add] = lt;
                    if (gt !== null)
                        result[(gte ? "$gte" : "$gt") + add] = gt;
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

        queryDeterminedByAttrs: function(query, attributes, requireInequality) {
            return Objs.exists(query, function(value, key) {
                if (key === "$and") {
                    return Objs.exists(value, function(q) {
                        return this.queryDeterminedByAttrs(q, attributes, requireInequality);
                    }, this);
                } else if (key === "$or") {
                    return Objs.all(value, function(q) {
                        return this.queryDeterminedByAttrs(q, attributes, requireInequality);
                    }, this);
                } else
                    return key in attributes && (!requireInequality || attributes[key] !== value);
            }, this);
        },

        searchTextQuery: function(text, ignoreCase) {
            return {
                $regex: Strings.regexEscape(text || ""),
                $options: ignoreCase ? "i" : ""
            };
        }

    };
});