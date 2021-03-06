Scoped.define("module:Databases.Migrator", [
    "base:Class",
    "base:Types"
], function(Class, Types, scoped) {
    return Class.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function() {
                inherited.constructor.call(this);
                this.__version = null;
                this.__migrations = [];
                this.__sorted = true;
            },

            version: function(offset) {
                if (!this.__version)
                    this.__version = this._getVersion();
                return this.__version;
            },

            _getVersion: function() {},

            _setVersion: function(version) {},

            _log: function(s) {},

            migrations: function() {
                if (!this.__sorted) {
                    this.__migrations.sort(function(x, y) {
                        return x.version - y.version;
                    });
                    this.__sorted = true;
                }
                return this.__migrations;
            },

            register: function(migration) {
                this.__migrations.push(migration);
                this.__sorted = false;
            },

            _indexByVersion: function(version) {
                for (var i = 0; i < this.__migrations.length; ++i) {
                    if (version == this.__migrations[i].version)
                        return i;
                    else if (version < this.__migrations[i].version)
                        return i - 1;
                }
                return this.__migrations.length;
            },

            migrate: function(version) {
                var current = this._indexByVersion(this.version());
                var target = Types.is_defined(version) ? this._indexByVersion(version) : this.__migrations.length - 1;
                while (current < target) {
                    var migration = this.__migrations[current + 1];
                    this._log("Migrate " + migration.version + ": " + migration.title + " - " + migration.description + "...\n");
                    try {
                        migration.migrate();
                        this._setVersion(this.__migrations[current + 1].version);
                        current++;
                        this._log("Successfully migrated " + migration.version + ".\n");
                    } catch (e) {
                        this._log("Failure! Rolling back " + migration.version + "...\n");
                        try {
                            if ("partial_rollback" in migration)
                                migration.partial_rollback();
                            else if ("rollback" in migration)
                                migration.rollback();
                            else
                                throw "No rollback defined";
                        } catch (ex) {
                            this._log("Failure! Couldn't roll back " + migration.version + "!\n");
                            throw ex;
                        }
                        this._log("Rolled back " + migration.version + "!\n");
                        throw e;
                    }
                }
            },

            rollback: function(version) {
                var current = this._indexByVersion(this.version());
                var target = Types.is_defined(version) ? this._indexByVersion(version) : current - 1;
                while (current > target) {
                    var migration = this.__migrations[current];
                    this._log("Rollback " + migration.version + ": " + migration.title + " - " + migration.description + "...\n");
                    try {
                        migration.rollback();
                        this._setVersion(current >= 1 ? this.__migrations[current - 1].version : 0);
                        current--;
                        this._log("Successfully rolled back " + migration.version + ".\n");
                    } catch (e) {
                        this._log("Failure! Couldn't roll back " + migration.version + "!\n");
                        throw e;
                    }
                }
            }

        };
    });
});