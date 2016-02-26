The BetaJS Data module contains the following subsystems:
- Query Engine
- Data Store System
- Model / Table System
- Data-based Collections

#### Queries

```javascript
  {
    "gender": "male",
    "age": {
      "$gt": 16
    },
    "first_name": {
      "$sw": "S"
    }
  }
```

```javascript
  evaluate(query, {"gender": "female", ...}) === false
  evaluate(query, {"age": 16, ...}) === false
  evaluate(query, {"first_name": "Guybrush", ...}) === false
  evaluate(query, {"gender": "male", "age": 17, "first_name": "Simon"}) === true
``` 

#### Data Stores

```javascript
   store.insert(instance).success(function (data) {
     // Instance was inserted, and the updated data of instance is data (including the id)
   }).error(function (error) {
     // Could not insert instance
   });
```

```javascript
   store.query(query, constraints).success(function (iterator) {
     // Store was succesfully queried; the query result is an iterator over matched instances.
   }).error(function (error) {
     // Could not execute query
   });
```


#### Modelling

```javascript
   var MyModel = BetaJS.Data.Modelling.Model.extend(null, {
   }, function (inherited) {
        return {
            _initializeScheme: function () {
                var scheme = inherited._initializeScheme.call(this);
                scheme.first_name = {
                    type: "string"
                };
                scheme.last_name = {
                    type: "string"
                };
                return scheme;
           }
        };
   });
```

```javascript
   var myTable = new BetaJS.Data.Modelling.Table(store, MyModel);
```


#### Query Collections

```javascript
   var tableQC = new BetaJS.Data.Collections.TableQueryCollection(table, query, options);
   var storeQC = new BetaJS.Data.Collections.StoreQueryCollection(store, query, options);
```
