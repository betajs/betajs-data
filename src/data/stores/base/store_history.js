Scoped.define("module:Stores.StoreHistory", [
	"base:Class",
	"base:Events.EventsMixin",
	"base:Objs",
	"base:Types",
	"module:Stores.MemoryStore"
], function (Class, EventsMixin, Objs, Types, MemoryStore, scoped) {
	return Class.extend({scoped: scoped}, [EventsMixin, function (inherited) {
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
				this.historyStore = historyStore || this.auto_destroy(new MemoryStore());
				this.sourceStore = sourceStore;
				this.commitId = 1;
				if (sourceStore) {
					sourceStore.on("insert", this.sourceInsert, this);
					sourceStore.on("remove", this.sourceRemove, this);
					sourceStore.on("update", this.sourceUpdate, this);
				}
			},

			lockCommits: function () {
				this.lockedCommits = this.commitId;
			},

			unlockCommits: function () {
				delete this.lockedCommits;
			},

			sourceInsert: function (data) {
				this.commitId++;
				this.historyStore.insert(Objs.extend({
					row: data,
					type: "insert",
					row_id: data[this._options.source_id_key],
					commit_id: this.commitId
				}, this._options.row_data));
				this.trigger("insert", this.commitId);
				return this.commitId;
			},

			sourceUpdate: function (row, data, dummy_ctx, pre_data) {
				this.commitId++;
				var row_id = Types.is_object(row) ? row[this._options.source_id_key] : row;
				var target_type = "update";
				if (this._options.combine_insert_update || this._options.combine_update_update) {
					var types = [];
					if (this._options.combine_insert_update)
						types.push({"type": "insert"});
					if (this._options.combine_update_update)
						types.push({"type": "update"});
					var combined_data = {};
					var delete_ids = [];
					var query = Objs.extend({ row_id: row_id }, this._options.filter_data);
					if (this.lockedCommits)
						query.commit_id = {"$gt": this.lockedCommits};
					if (types.length === 1)
						query.type = types[0];
					else
						query.$or = types;
					var iter = this.historyStore.query(query, {sort: {commit_id: 1}}).value();
					while (iter.hasNext()) {
						var itemData = iter.next();
						if (itemData.type === "insert")
							target_type = "insert";
						combined_data = Objs.extend(combined_data, itemData.row);
						delete_ids.push(this.historyStore.id_of(itemData));
					}
					iter.destroy();
					data = Objs.extend(combined_data, data);
					Objs.iter(delete_ids, this.historyStore.remove, this.historyStore);
				}
				this.historyStore.insert(Objs.extend({
					row: data,
					pre_data: pre_data,
					type: target_type,
					row_id: row_id,
					commit_id: this.commitId
				}, this._options.row_data));
                this.trigger("update", this.commitId);
                this.trigger("update:" + row_id, this.commitId);
                return this.commitId;
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
						iter.destroy();
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
					iter2.destroy();
				}
				this.historyStore.insert(Objs.extend({
					type: "remove",
					row_id: id,
					row: data,
					commit_id: this.commitId
				}, this._options.row_data));
                this.trigger("remove", this.commitId);
                this.trigger("remove:" + id, this.commitId);
                return this.commitId;
			},

			getCommitById: function (commitId) {
				return this.historyStore.query({
					commit_id: commitId
				}, {
					limit: 1
				}).mapSuccess(function (commits) {
					var result = commits.next();
					commits.destroy();
					return result;
				});
			},

			undoCommit: function (commit) {
				if (commit.type === "insert") {
					return this.sourceStore.remove(commit.row_id);
                } else if (commit.type === "remove") {
					return this.sourceStore.insert(commit.row);
				} else if (commit.type === "update") {
					return this.sourceStore.update(commit.row_id, commit.pre_data || {});
				}
			},

			undoCommitById: function (commitId) {
				return this.getCommitById(commitId).mapSuccess(function (commit) {
					return this.undoCommit(commit).success(function () {
						this.historyStore.remove(this.historyStore.id_of(commit));
					}, this);
				}, this);
			}

		};
	}]);
});
