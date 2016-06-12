var s = function (Data) {
	var store = new Data.Stores.MemoryStore();
	for (var i = 0; i < 100; ++i)
		for (var j = 0; j < 100; ++j)
			store.insert({i:i,j:j});
	return store;
};

var store = s(BetaJS.Data);
var storeOld = s(DataOld);

var f = function (store) {
	store.query({j: 50}).value().asArray();
};

module.exports = {
	name : 'Memory Store Query',
	tests : {
		'Old Memory Store Query' : function () {
			f(storeOld);
		},
		'New Memory Store Query' : function() {
			f(store);
		}
	}
};
