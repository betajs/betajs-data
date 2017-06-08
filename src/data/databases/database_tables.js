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
                    return result.next();
                });
            },

            _encode: function(data) {
                return data;
            },

            _decode: function(data) {
                return data;
            },

            _find: function(query, options) {},

            find: function(query, options) {
                return this._find(this._encode(query), options).mapSuccess(function(result) {
                    return new MappedIterator(result, this._decode, this);
                }, this);
            },

            findById: function(id) {
                return this.findOne(Objs.objectBy(this.primary_key(), id));
            },

            count: function(query) {
                return this._count(this._encode(query));
            },

            _insertRow: function(row) {},

            _removeRow: function(query) {},

            _updateRow: function(query, row) {},

            _count: function(query) {},

            insertRow: function(row) {
                return this._insertRow(this._encode(row)).mapSuccess(this._decode, this);
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

            ensureIndex: function(key) {}

        };
    });
});