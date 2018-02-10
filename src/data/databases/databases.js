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