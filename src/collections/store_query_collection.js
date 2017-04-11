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