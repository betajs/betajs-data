Store indices are database indices. By adding indices for certain keys to your stores, you can speed up queries. Indices can be created as follows, given a ``store``:

```javascript
    store.indices.first_name = new BetaJS.Data.Stores.MemoryIndex(store, "first_name");
    store.indices.last_name = new BetaJS.Data.Stores.MemoryIndex(store, "last_name");
``` 