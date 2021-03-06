Scoped.define("module:Stores.Watchers.StoreWatcherMixin", [], function() {
	return {

		watchItem : function(id, context) {},

		unwatchItem : function(id, context) {},

		watchInsert : function(query, context) {},

		unwatchInsert : function(query, context) {},

		_removedWatchedItem : function(id) {
			this.trigger("remove", id);
		},

		_updatedWatchedItem : function(row, data, transaction_id) {
			this.trigger("update", row, data, null, null, transaction_id);
		},

		_insertedWatchedInsert : function(data) {
			this.trigger("insert", data);
		},
		
		delegateStoreEvents: function (store) {
			this.on("insert", function (data) {
				store.trigger("insert", data);
			}, store).on("update", function (row, data, transaction_id) {
				store.trigger("update", row, data, null, null, transaction_id);
			}, store).on("remove", function (id) {
				store.trigger("remove", id);
			}, store);
		},

		undelegateStoreEvents: function (store) {
			this.off(null, null, store);
		}

	};	
});


Scoped.define("module:Stores.Watchers.StoreWatcher", [
	"base:Class",
	"base:Objs",
	"base:Events.EventsMixin",
	"base:Classes.ContextRegistry",
	"base:Comparators",
	"module:Stores.Watchers.StoreWatcherMixin",
	"module:Queries"
], function(Class, Objs, EventsMixin, ContextRegistry, Comparators, StoreWatcherMixin, Queries, scoped) {
	return Class.extend({scoped: scoped}, [EventsMixin, StoreWatcherMixin, function (inherited) {
		return {

			constructor: function (options) {
				inherited.constructor.call(this);
				options = options || {};
				if (options.id_key)
					this.id_key = options.id_key;
				else
					this.id_key = "id";
				this.__ctx = options.ctx;
				this.__customCtxFilter = options.customCtxFilter;
				this.__items = new ContextRegistry();
				this.__inserts = new ContextRegistry(Queries.serialize, Queries);
			},

			destroy: function () {
				this.insertsIterator().iterate(this.unwatchInsert, this);
				this.itemsIterator().iterate(this.unwatchItem, this);
				this.__inserts.destroy();
				this.__items.destroy();
				inherited.destroy.call(this);
			},

			insertsIterator: function () {
				return this.__inserts.iterator();
			},

            itemsIterator: function () {
                return this.__items.iterator();
            },

			watchItem : function(id, context) {
				if (this.__items.register(id, context))
                    this._watchItem(id);
			},

			unwatchItem : function(id, context) {
				this.__items.unregister(id, context).forEach(this._unwatchItem, this);
			},

			watchInsert : function(query, context) {
				if (this.__inserts.register(query, context))
					this._watchInsert(query);
			},

			unwatchInsert : function(query, context) {
				this.__inserts.unregister(query, context).forEach(this._unwatchInsert, this);
			},

			_ctxFilter: function (ctx, data) {
				return !this.__ctx || !ctx || Comparators.deepEqual(this.__ctx, ctx, 2) || (this.__customCtxFilter && this.__customCtxFilter(this.__ctx, ctx, data));
			},

			_removedItem : function(id, ctx) {
				if (!this._ctxFilter(ctx))
					return;
				if (!this.__items.get(id))
					return;
				// @Oliver: I am not sure why this is commented out, but tests fail if we comment it in.
				// this.unwatchItem(id, null);
				this._removedWatchedItem(id);
			},

			_updatedItem : function(row, data, ctx, transaction_id) {
                if (!this._ctxFilter(ctx, row))
                    return;
				var id = row[this.id_key];
				if (this.__items.get(id))
					this._updatedWatchedItem(row, data, transaction_id);
				this._insertedInsert(Objs.extend(Objs.clone(row, 1), data), ctx);
			},

			_insertedInsert : function(data, ctx) {
                if (!this._ctxFilter(ctx, data))
                    return;
				var trig = false;
				var iter = this.__inserts.iterator();
				while (!trig && iter.hasNext())
					trig = Queries.evaluate(iter.next().query, data);
				if (trig)
					this._insertedWatchedInsert(data);
			},

			unregisterItem: function (id, context) {
				if (this.__items.unregister(id, context))
					this._unregisterItem(id);
			},			

			_watchItem : function(id) {},

			_unwatchItem : function(id) {},

			_watchInsert : function(query) {},

			_unwatchInsert : function(query) {},

			reconnect: function () {
                this.itemsIterator().iterate(this._watchItem, this);
                this.insertsIterator().iterate(this._watchInsert, this);
			}

		};
	}]);
});

