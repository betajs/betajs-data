Scoped.define("module:Modelling.Associations.Association", [
        "base:Class",
        "base:Promise",
        "base:Iterators"
    ], function (Class, Promise, Iterators, scoped) {
    return Class.extend({scoped: scoped}, function (inherited) {
		return {
		
		  	constructor: function (model, options) {
		  		inherited.constructor.call(this);
		  		this._model = model;
		  		this._options = options || {};
		  		if (options["delete_cascade"]) {
		  			model.on("remove", function () {
		  				this.__delete_cascade();
		  			}, this);
		  		}
		  	},
		  	
		  	__delete_cascade: function () {
		  		this.yield().success(function (iter) {
					iter = Iterators.ensure(iter).toArray();
					while (iter.hasNext())
						iter.next().remove({});
		  		}, this);
		  	},
		  	
		  	yield: function () {
		  		if ("__cache" in this)
		  			return Promise.create(this.__cache);
		  		var promise = this._yield();
		  		if (this._options["cached"]) {
		  			promise.callback(function (error, value) {
		  				this.__cache = error ? null : value;
		  			}, this);
		  		}
		  		return promise;
		  	},
		  	
		  	invalidate: function () {
		  		delete this.__cache;
		  	}

		};
    });
});