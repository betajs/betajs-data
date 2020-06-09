Scoped.define("module:Databases.AggregatedKeysDatabaseTableWrapper", [
    "module:Databases.DatabaseTable",
    "base:Objs",
    "base:Types"
], function(Class, Objs, Types, scoped) {
    return Class.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(database, table_name, table_options) {
                inherited.constructor.call(this, database, table_name, table_options);
                table_options = table_options || {};
                this._aggregation = {
                    aggregates: {},
                    attributes_aggregates_dependencies: {},
                    attributes_attributes_dependencies: {}
                };
                Objs.iter(table_options.aggregates, function(aggregate) {
                    var aggregateName = aggregate.join("_");
                    this._aggregation.aggregates[aggregateName] = aggregate;
                    aggregate.forEach(function(attr) {
                        this._aggregation.attributes_aggregates_dependencies[attr] = this._aggregation.attributes_aggregates_dependencies[attr] || [];
                        this._aggregation.attributes_aggregates_dependencies[attr].push(aggregateName);
                        this._aggregation.attributes_attributes_dependencies[attr] = this._aggregation.attributes_attributes_dependencies[attr] || {};
                        Objs.extend(this._aggregation.attributes_attributes_dependencies[attr], Objs.objectify(aggregate));
                    }, this);
                }, this);
                this._aggregation.attributes_attributes_dependencies = Objs.map(this._aggregation.attributes_attributes_dependencies, function(value) {
                    return Objs.keys(value);
                });
                delete table_options.aggregates;
                this.__databaseTable = database.database().getTable(table_name, table_options);
            },

            databaseTable: function() {
                return this.__databaseTable;
            },

            deleteTable: function() {
                return this.databaseTable().deleteTable();
            },

            createTable: function() {
                return this.databaseTable().createTable();
            },

            _aggregatesOf: function(row) {
                var result = {};
                Objs.iter(this._aggregation.aggregates, function(aggregate, aggregateName) {
                    var valid = true;
                    var mapped = aggregate.map(function(key) {
                        if (!(key in row))
                            valid = false;
                        return row[key];
                    });
                    if (valid) {
                        var keys = [];
                        var values = [];
                        mapped.forEach(function(entry) {
                            if (Types.is_object(entry)) {
                                keys.push(Objs.ithKey(entry));
                                values.push(Objs.ithValue(entry));
                            } else
                                values.push(entry);
                        });
                        result[aggregateName] = keys.length > 0 ? Objs.objectBy(keys[0], values.join("_")) : values.join("_");
                    }
                }, this);
                return result;
            },

            _missingAggregateDependencies: function(row) {
                var result = {};
                Objs.iter(this._aggregation.aggregates, function(aggregate) {
                    var depends = false;
                    var missing = [];
                    aggregate.forEach(function(key) {
                        if (key in row)
                            depends = true;
                        else
                            missing.push(key);
                    });
                    if (depends && missing.length > 0) {
                        missing.forEach(function(key) {
                            result[key] = true;
                        });
                    }
                }, this);
                return result;
            },

            _insertRow: function(row) {
                return this.databaseTable().insertRow(Objs.extend(this._aggregatesOf(row), row));
            },

            _removeRow: function(row) {
                return this.databaseTable().removeRow(Objs.extend(this._aggregatesOf(row), row));
            },

            _updateRow: function(query, row) {
                var missingDeps = this._missingAggregateDependencies(row);
                for (var key in missingDeps) {
                    if (key in query) {
                        row[key] = query[key];
                        delete missingDeps[key];
                    }
                }
                if (Types.is_empty(missingDeps))
                    return this.databaseTable().updateRow(Objs.extend(this._aggregatesOf(query), query), row);
                return this.findOne(Objs.extend(this._aggregatesOf(query), query)).mapSuccess(function(data) {
                    data = Objs.extend(data, query);
                    return this.databaseTable().updateRow(Objs.extend(this._aggregatesOf(data), data), row);
                }, this);
            },

            _find: function(query, options) {
                return this.databaseTable().find(Objs.extend(this._aggregatesOf(query), query), options);
            }

        };
    });
});

Scoped.define("module:Databases.AggregatedKeysDatabaseWrapper", [
    "module:Databases.Database",
    "module:Databases.AggregatedKeysDatabaseTableWrapper"
], function(Class, AggregatedKeysDatabaseTableWrapper, scoped) {
    return Class.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(database) {
                inherited.constructor.apply(this);
                this.__database = database;
            },

            database: function() {
                return this.__database;
            },

            _tableClass: function() {
                return AggregatedKeysDatabaseTableWrapper;
            }

        };

    });
});