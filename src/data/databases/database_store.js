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

            constructor: function(database, table_name, foreign_id) {
                inherited.constructor.call(this, {
                    id_key: foreign_id || "id"
                });
                this.__database = database;
                this.__table_name = table_name;
                this.__table = null;
                this.__foreign_id = foreign_id;
            },

            table: function() {
                if (!this.__table)
                    this.__table = this.__database.getTable(this.__table_name);
                return this.__table;
            },

            _remove: function(id) {
                if (!this.__foreign_id)
                    return this.table().removeById(id);
                return this.table().removeRow(Objs.objectBy(this.__foreign_id, id));
            },

            _get: function(id) {
                if (!this.__foreign_id)
                    return this.table().findById(id);
                return this.table().findOne(Objs.objectBy(this.__foreign_id, id));
            },

            _update: function(id, data) {
                if (!this.__foreign_id)
                    return this.table().updateById(id, data);
                return this.table().updateRow(Objs.objectBy(this.__foreign_id, id), data);
            },

            _query_capabilities: function() {
                return ConstrainedQueries.fullConstrainedQueryCapabilities(Queries.fullQueryCapabilities());
            },

            _insert: function(data) {
                if (this.__foreign_id) {
                    if (data[this.__foreign_id])
                        return this.table().insertRow(data);
                    else
                        return this.table().insertRow(data);
                } else {
                    return this.table().insertRow(data);
                }
                /*
			    if (!this.__foreign_id || !data[this.__foreign_id])
			        return this.table().insertRow(data);
			    return this.table().findOne(Objs.objectBy(this.__foreign_id, data[this.__foreign_id])).mapSuccess(function (result) {
			    	return result ? result : this.table().insertRow(data);
			    }, this);
			    */
            },

            _query: function(query, options) {
                return this.table().find(query, options);
            },

            _ensure_index: function(key) {
                this.table().ensureIndex(key);
            }

        };
    });
});