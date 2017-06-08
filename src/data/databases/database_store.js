Scoped.define("module:Stores.DatabaseStore", [
    "module:Stores.BaseStore",
    "base:Objs",
    "module:Queries",
    "module:Queries.Constrained"
], function(BaseStore, Objs, Queries, ConstrainedQueries, scoped) {
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
                    return new MappedIterator(results, function(data) {
                        data[this.id_key()] = data[this.table().primary_key()];
                        delete data[this.table().primary_key()];
                        return data;
                    }, this);
                }) : promise;
            },

            _ensure_index: function(key) {
                this.table().ensureIndex(key);
            }

        };
    });
});