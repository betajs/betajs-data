While the query language itself only allows you to specify a condition that instances have to satisfy, **constrained queries** allow you to additionally limit the number of query results as well as specify the order in which the query results come in.

Given a ``query``, a ``constrainedQuery`` looks as follows:
```javascript
   constrainedQuery = {
     query: query,
     options: {
       limit: integer or null,
       skip: integer or null,
       sort: {
         key1: 1 or -1,
         key2: 1 or -1,
         ...
       }
     }
   }
```

All options are optional.  