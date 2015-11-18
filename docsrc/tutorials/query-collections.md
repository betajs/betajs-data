Query Collections are collections which are based on a store or a table query. Its items are either instantiated properties from the query result (if it is based on a store) or instantied models (if it is based on a table).

Query Collections should be seen as a **read only** representation of a query. You should never add elements directly to a query collection. Instead, you should add the instance to the store or the table.

```javascript
   var tableQC = new BetaJS.Data.Collections.TableQueryCollection(table, query, options);
   var storeQC = new BetaJS.Data.Collections.StoreQueryCollection(store, query, options);
```

The following (among other) options are supported:
- ``active``: should the query collection actively update itself? (default false)
- ``incremental``: whenever the query is updated, should only the diff be queried? (default true)
- ``active_bounds``: if the query collection is bounded and new items are added, should the bound be extended? (default true)
- ``range``: limit query results (default disabled)
- ``auto``: should the system immediately run the query (default false)
