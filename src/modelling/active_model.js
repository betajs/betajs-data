Scoped.extend("module:Modelling.ActiveModel", [
    "base:Properties.Properties",
    "base:Async",
    "base:Objs",
    "module:Queries"
], function(Properties, Async, Objs, Queries, scoped) {
    return Properties.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function(table, query, queryopts, options) {
                inherited.constructor.call(this);
                this._options = options || {};
                this._table = table;
                this._watcher = table.store().watcher();
                this._query = query;
                this._queryopts = queryopts || {};
                this.set("model", null);
                this._unregisterModel();
                if (this._watcher) {
                    this._watcher.watchInsert({
                        query: this._query,
                        options: Objs.extend({
                            limit: 1
                        }, this._queryopts)
                    }, this);
                }
                this._table.on("create", function(data) {
                    if (!Queries.evaluate(this._query, data))
                        return;
                    if (!this._queryopts.sort && this.get("model"))
                        return;
                    if (this.get("model"))
                        this._unregisterModel();
                    else
                        this._registerModel(this._table.materialize(data));
                }, this);
            },

            destroy: function() {
                if (this._watcher) {
                    this._watcher.unwatchInsert(null, this);
                    this._watcher.unwatchItem(null, this);
                }
                if (this.get("model"))
                    this.get("model").weakDestroy();
                this._table.off(null, null, this);
                inherited.destroy.call(this);
            },

            _watcher: function() {
                return this._table.store().watcher();
            },

            update: function(query) {
                this._query = query;
                if (!this.get("model") || !Properties.is_class_instance(this.get("model")) || !Queries.evaluate(this._query, this.get("model").data()))
                    this._unregisterModel();
            },

            _registerModel: function(model) {
                this.set("model", model);
                if (this._watcher && !model.isNew())
                    this._watcher.watchItem(model.id(), this);
                model.on("change", function() {
                    if (!Queries.evaluate(this._query, model.data()))
                        this._unregisterModel();
                }, this);
                model.on("remove", function() {
                    this._unregisterModel();
                }, this);
            },

            _unregisterModel: function() {
                var model = this.get("model");
                if (model && Properties.is_class_instance(model)) {
                    Async.eventually(function() {
                        model.weakDestroy();
                    });
                }
                if (this._watcher)
                    this._watcher.unwatchItem(null, this);
                this.set("model", null);
                this._table.findBy(this._query, this._queryopts).success(function(model) {
                    if (model)
                        this._registerModel(model);
                    else if (this._options.create_virtual)
                        this._registerModel(this._options.create_virtual.call(this._options.create_virtual_ctx || this, this._query));
                }, this);
            }

        };
    });
});