Stores define an abstract database interface. Stores derive from the abstract class ``BetaJS.Data.Stores.BaseStore`` which defines the following asynchronous methods:


### Insert

```javascript
   store.insert(instance).success(function (data) {
     // Instance was inserted, and the updated data of instance is data (including the id)
   }).error(function (error) {
     // Could not insert instance
   });
```

An instance is a json object. Every item in a store is given a unique id upon inserting it. It is then used to identify the item from thereon.


### Update

```javascript
   store.update(id, updatedData).success(function (data) {
     // Instance was updated, and the updated data of instance is data
   }).error(function (error) {
     // Could not update instance
   });
```


### Remove

```javascript
   store.remove(id).success(function () {
     // Instance was removed
   }).error(function (error) {
     // Could not removed instance
   });
```


### Get

```javascript
   store.get(id).success(function (instance) {
     // Instance was obtained
   }).error(function (error) {
     // Could not read instance
   });
```


### Query
```javascript
   store.query(query, constraints).success(function (iterator) {
     // Store was succesfully queried; the query result is an iterator over matched instances.
   }).error(function (error) {
     // Could not execute query
   });
```


### Store Classes

The most important simple stores are:
- ``new BetaJS.Data.Stores.MemoryStore()``: stores all data in the temporary memory of the browser / NodeJS
- ``new BetaJS.Data.Stores.LocalStore({}, localStorage)``: stores all data in the permanent memory of the browser
- ``new BetaJS.Data.Stores.RemoteStore(...)``: stores all data in a store on a server across a network 