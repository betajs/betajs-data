Scoped.define("module:Stores.StoreHistory", [
                                             "base:Class",
                                             "base:Objs",
                                             "base:Types",
                                             "module:Stores.MemoryStore"
                                             ], function (Class, Objs, Types, MemoryStore, scoped) {
	return Class.extend({scoped: scoped}, function (inherited) {
		return {

			constructor: function (sourceStore, historyStore, options) {
				inherited.constructor.call(this);
				this._options = Objs.extend({
					combine_update_update: false,
					combine_insert_update: false,
					combine_insert_remove: false,
					combine_update_remove: false,
					source_id_key: sourceStore ? sourceStore.id_key() : "id",
					row_data: {},
					filter_data: {}
				}, options);
				this.historyStore = historyStore || new MemoryStore();
				this.commitId = 1;
				if (sourceStore) {
					sourceStore.on("insert", this.sourceInsert, this);
					sourceStore.on("remove", this.sourceRemove, this);
					sourceStore.on("update", this.sourceUpdate, this);
				}
			},

			sourceInsert: function (data) {
				this.commitId++;
				this.historyStore.insert(Objs.extend({
					row: data,
					type: "insert",
					row_id: data[this._options.source_id_key],
					commit_id: this.commitId
				}, this._options.row_data));
			},

			sourceUpdate: function (row, data) {
				this.commitId++;
				var row_id = Types.is_object(row) ? row[this._options.source_id_key] : row;
				var target_type = "update";
				if (this._options.combine_insert_update || this._options.combine_update_update) {
					var types = [];
					if (this._options.combine_insert_update)
						types.push("insert");
					if (this._options.combine_update_update)
						types.push("update");
					var combined_data = {};
					var delete_ids = [];
					var iter = this.historyStore.query(Objs.extend({
						type: {"$or": types},
						row_id: row_id
					}, this._options.filter_data), {sort: {commit_id: 1}}).value();
					while (iter.hasNext()) {
						var itemData = iter.next();
						if (itemData.type === "insert")
							target_type = "insert";
						combined_data = Objs.extend(combined_data, itemData.row);
						delete_ids.push(this.historyStore.id_of(itemData));
					}
					data = Objs.extend(combined_data, data);
					Objs.iter(delete_ids, this.historyStore.remove, this.historyStore);
				}
				this.historyStore.insert(Objs.extend({
					row: data,
					type: target_type,
					row_id: row_id,
					commit_id: this.commitId
				}, this._options.row_data));
			},

			sourceRemove: function (id, data) {
				this.commitId++;
				if (this._options.combine_insert_remove) {
					if (this.historyStore.query(Objs.extend({
						type: "insert",
						row_id: id
					}, this._options.filter_data)).value().hasNext()) {
						var iter = this.historyStore.query(Objs.extend({
							row_id: id
						}, this._options.filter_data)).value();
						while (iter.hasNext())
							this.historyStore.remove(this.historyStore.id_of(iter.next()));
						return;
					}
				}
				if (this._options.combine_update_remove) {
					var iter2 = this.historyStore.query(Objs.extend({
						type: "update",
						row_id: id
					}, this._options.filter_data)).value();
					while (iter2.hasNext())
						this.historyStore.remove(this.historyStore.id_of(iter2.next()));
				}
				this.historyStore.insert(Objs.extend({
					type: "remove",
					row_id: id,
					row: data,
					commit_id: this.commitId
				}, this._options.row_data));
			}

		};
	});
});
