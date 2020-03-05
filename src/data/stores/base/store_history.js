Scoped.define("module:Stores.StoreHistory", [
	"base:Class",
	"base:Classes.CriticalSectionMixin",
	"base:Events.EventsMixin",
	"base:Objs",
	"base:Types",
	"base:Promise",
	"module:Stores.MemoryStore"
], function (Class, CriticalSectionMixin, EventsMixin, Objs, Types, Promise, MemoryStore, scoped) {
	return Class.extend({scoped: scoped}, [EventsMixin, CriticalSectionMixin, function (inherited) {
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
				return this.criticalSection("commit", function () {
					this.commitId++;
					return this.historyStore.insert(Objs.extend({
						row: data,
						type: "insert",
						row_id: data[this._options.source_id_key],
						commit_id: this.commitId
					}, this._options.row_data)).mapSuccess(function () {
						this.trigger("insert", this.commitId);
						return this.commitId;
					}, this);
				});
			},

			sourceUpdate: function (row, data, dummy_ctx, pre_data, transaction_id) {
				return this.criticalSection("commit", function () {
					this.commitId++;
					var row_id = Types.is_object(row) ? row[this._options.source_id_key] : row;
					var target_type = "update";
					var cont = Promise.create();
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
							query = Objs.extend(query, types[0]);
						else
							query.$or = types;
						this.historyStore.query(query, {sort: {commit_id: 1}}).success(function (iter) {
							while (iter.hasNext()) {
								var itemData = iter.next();
								if (itemData.type === "insert")
									target_type = "insert";
								combined_data = Objs.extend(combined_data, itemData.row);
								delete_ids.push(this.historyStore.id_of(itemData));
							}
							iter.destroy();
							data = Objs.extend(combined_data, data);
							this.historyStore.removeAllByIds(delete_ids);
							cont.asyncSuccess(true);
						}, this);
					} else
						cont.asyncSuccess(true);
					return cont.mapSuccess(function () {
						return this.historyStore.insert(Objs.extend({
							row: data,
							pre_data: pre_data,
							type: target_type,
							row_id: row_id,
							commit_id: this.commitId,
							transaction_id: transaction_id
						}, this._options.row_data)).success(function () {
							this.trigger("update", this.commitId);
							this.trigger("update:" + row_id, this.commitId);
						}, this);
					}, this);
				});
			},

			sourceRemove: function (id, data) {
				return this.criticalSection("commit", function () {
					this.commitId++;
					var cont = Promise.create();
					if (this._options.combine_insert_remove) {
						this.historyStore.query(Objs.extend({
							type: "insert",
							row_id: id
						}, this._options.filter_data)).success(function (iter) {
							if (iter.hasNext()) {
								this.historyStore.removeAllByQuery(Objs.extend({
									row_id: id
								}, this._options.filter_data)).forwardCallback(cont);
							} else
								cont.asyncSuccess(true);
							iter.destroy();
						}, this);
					} else
						cont.asyncSuccess(true);
					if (this._options.combine_update_remove) {
						cont = cont.mapSuccess(function () {
							return this.historyStore.removeAllByQuery(Objs.extend({
								type: "update",
								row_id: id
							}, this._options.filter_data));
						}, this);
					}
					return cont.mapSuccess(function () {
						return this.historyStore.insert(Objs.extend({
							type: "remove",
							row_id: id,
							row: data,
							commit_id: this.commitId
						}, this._options.row_data)).success(function () {
							this.trigger("remove", this.commitId);
							this.trigger("remove:" + id, this.commitId);
						}, this);
					}, this);
				});
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
