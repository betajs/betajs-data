Scoped.define("module:Modelling.GroupedProperties", [
    "module:Modelling.AssociatedProperties",
    "base:Objs",
    "base:Types",
    "base:Collections.Collection"
], function(AssociatedProperties, Objs, Types, Collection, scoped) {
    return AssociatedProperties.extend({
        scoped: scoped
    }, function(inherited) {
        return {

            constructor: function() {
                inherited.constructor.apply(this, arguments);

                var silent = false;
                var items = this.auto_destroy(new Collection());
                this[this.cls.groupedItemsKey] = items;
                this.set(this.cls.groupedItemsCount, 0);
                items.on("add remove", function() {
                    this.set(this.cls.groupedItemsCount, items.count());
                }, this);

                /* Methods */
                Objs.extend(this, Objs.map(this.cls.groupedMethods, function(methodFunc) {
                    if (Types.is_string(methodFunc))
                        methodFunc = this.cls.methodsHelper[methodFunc];
                    return function() {
                        return methodFunc(items, methodKey, arguments);
                    };
                }, this));

                /* Setter */
                Objs.iter(this.cls.groupedSetters, function(setterFunc, attrKey) {
                    if (Types.is_string(setterFunc))
                        setterFunc = this.cls.settersHelper[setterFunc];
                    this.on("change:" + attrKey, function(attrValue) {
                        if (silent)
                            return;
                        setterFunc(items, attrKey, attrValue);
                    });
                }, this);

                /* Getter */
                Objs.iter(this.cls.groupedGetters, function(metaAttr, attrKey) {
                    if (Types.is_string(metaAttr)) {
                        if (!this.cls.gettersHelper[metaAttr]) {
                            console.warn("Unknown Getter: " + metaAttr);
                            return;
                        }
                        metaAttr = this.cls.gettersHelper[metaAttr];
                    }
                    var groupValue = null;
                    if (metaAttr.add) {
                        items.on("add", function(item) {
                            groupValue = metaAttr.add(groupValue, item.get(attrKey), item);
                            silent = true;
                            this.set(attrKey, metaAttr.map ? metaAttr.map(groupValue) : groupValue);
                            silent = false;
                        }, this);
                    }
                    if (metaAttr.remove) {
                        items.on("remove", function(item) {
                            groupValue = metaAttr.remove(groupValue, item.get(attrKey), item);
                            silent = true;
                            this.set(attrKey, metaAttr.map ? metaAttr.map(groupValue) : groupValue);
                            silent = false;
                        }, this);
                    }
                    if (metaAttr.update) {
                        items.on("change:" + attrKey, function(item, newValue, oldValue) {
                            groupValue = metaAttr.update(groupValue, newValue, oldValue, items.getIndex(item), items.count(), item);
                            silent = true;
                            this.set(attrKey, metaAttr.map ? metaAttr.map(groupValue) : groupValue);
                            silent = false;
                        }, this);
                    }
                    if (metaAttr.first) {
                        items.on("add reindexed", function(item) {
                            if (items.getIndex(item) === 0)
                                groupValue = metaAttr.first(groupValue, item.get(attrKey));
                            silent = true;
                            this.set(attrKey, metaAttr.map ? metaAttr.map(groupValue) : groupValue);
                            silent = false;
                        }, this);
                    }
                    if (metaAttr.last) {
                        items.on("add reindexed", function(item) {
                            if (items.getIndex(item) === items.count() - 1)
                                groupValue = metaAttr.last(groupValue, item.get(attrKey));
                            silent = true;
                            this.set(attrKey, metaAttr.map ? metaAttr.map(groupValue) : groupValue);
                            silent = false;
                        }, this);
                    }
                }, this);
            }

        };
    }, {

        groupedItemsKey: "items",
        groupedItemsCount: "count",

        groupedMethods: {},
        groupedSetters: {},
        groupedGetters: {},

        methodsHelper: {
            all: function(items, methodName, methodArgs) {
                var result = null;
                items.iterate(function(item) {
                    result = item[methodName].apply(item, methodsArgs) || result;
                });
                return result;
            },
            first: function(items, methodName, methodArgs) {
                var item = items.first();
                return item ? item[methodName].apply(item, methodArgs) : undefined;
            },
            last: function(items, methodName, methodArgs) {
                var item = items.last();
                return item ? item[methodName].apply(item, methodArgs) : undefined;
            }
        },

        settersHelper: {
            all: function(items, attrKey, attrValue) {
                items.iterate(function(item) {
                    item.set(attrKey, attrValue);
                });
            },
            first: function(items, attrKey, attrValue) {
                var item = items.first();
                if (item)
                    item.set(attrKey, attrValue);
            },
            last: function(items, attrKey, attrValue) {
                var item = items.last();
                if (item)
                    item.set(attrKey, attrValue);
            }
        },

        gettersHelper: {
            exists: {
                add: function(groupValue, itemValue) {
                    return (groupValue || 0) + (itemValue ? 1 : 0);
                },
                remove: function(groupValue, itemValue) {
                    return (groupValue || 0) - (itemValue ? 1 : 0);
                },
                update: function(groupValue, newItemValue, oldItemValue) {
                    return (groupValue || 0) - (oldItemValue ? 1 : 0) + (newItemValue ? 1 : 0);
                },
                map: function(groupValue) {
                    return !!groupValue;
                }
            },
            all: {
                add: function(groupValue, itemValue) {
                    return (groupValue || 0) + (itemValue ? 0 : 1);
                },
                remove: function(groupValue, itemValue) {
                    return (groupValue || 0) - (itemValue ? 0 : 1);
                },
                update: function(groupValue, newItemValue, oldItemValue) {
                    return (groupValue || 0) - (oldItemValue ? 0 : 1) + (newItemValue ? 0 : 1);
                },
                map: function(groupValue) {
                    return !groupValue;
                }
            },
            first: {
                first: function(groupValue, itemValue) {
                    return itemValue;
                },
                update: function(groupValue, newItemValue, oldItemValue, itemIndex) {
                    return itemIndex === 0 ? newItemValue : groupValue;
                }
            },
            last: {
                last: function(groupValue, itemValue) {
                    return itemValue;
                },
                update: function(groupValue, newItemValue, oldItemValue, itemIndex, itemCount) {
                    return itemIndex === itemCount - 1 ? newItemValue : groupValue;
                }
            },
            uniqueUnion: {
                add: function(groupValue, itemValue, item) {
                    var result = Objs.clone(groupValue || {}, 1);
                    (itemValue || []).forEach(function(key) {
                        result[key] = result[key] || {};
                        result[key][item.cid()] = true;
                    });
                    return result;
                },
                remove: function(groupValue, itemValue, item) {
                    var result = Objs.clone(groupValue || {}, 1);
                    (itemValue || []).forEach(function(key) {
                        if (result[key]) {
                            delete result[key][item.cid()];
                            if (Types.is_empty(result[key]))
                                delete result[key];
                        }
                    });
                    return result;
                },
                update: function(groupValue, newItemValue, oldItemValue, itemIndex, itemCount, item) {
                    var result = Objs.clone(groupValue || {}, 1);
                    (oldItemValue || []).forEach(function(key) {
                        if (result[key]) {
                            delete result[key][item.cid()];
                            if (Types.is_empty(result[key]))
                                delete result[key];
                        }
                    });
                    (newItemValue || []).forEach(function(key) {
                        result[key] = result[key] || {};
                        result[key][item.cid()] = true;
                    });
                    return result;
                },
                map: function(groupValue) {
                    return Objs.keys(groupValue);
                }
            }
        }

    });
});