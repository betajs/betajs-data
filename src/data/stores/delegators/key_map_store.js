
Scoped.define("module:Stores.KeyMapStore", ["module:Stores.TransformationStore", "base:Objs"], function (TransformationStore, Objs, scoped) {
	return TransformationStore.extend({scoped: scoped}, function (inherited) {			
		return {
			
			constructor: function (store, options, map) {
				inherited.constructor.call(this, store, options);
				this.__encodeMap = map;
				this.__decodeMap = Objs.inverseKeyValue(map);
			},
			
			__mapBy: function (data, map) {
				var result = {};
				Objs.iter(data, function (value, key) {
					result[map[key] || key] = value;
				});
				return result;
			},
			
			_encodeData: function (data) {
				return this.__mapBy(data, this.__encodeMap);
			},
			
			_decodeData: function (data) {
				return this.__mapBy(data, this.__decodeMap);
			}

		};
	});
});
