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
                    "$le": this.__upperBound
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