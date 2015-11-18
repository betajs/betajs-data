The modelling system puts an abstraction layer on top of stores that allows us to treat database instances as properties such that changes in the properties instance are reflected back to the database and vice versa.

The role of json instances in the store system is provided by so-called ``Models`` whereas the role of the stores is provied by so-called ``Tables``.

A ``Model`` class is a sub class of ``Properties``. When you define your own model, you always define a scheme:

```javascript
   var MyModel = BetaJS.Data.Modelling.Model.extend(null, {
   }, function (inherited) {
        return {
            _initializeScheme: function () {
                var scheme = inherited._initializeScheme.call(this;
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

You usually do not instantiate model instances directly. Instead, you create a ``Table`` instance based on a ``store`` (which stores the actual data):

```javascript
   var myTable = new BetaJS.Data.Modelling.Table(store, MyModel);
```


### Create new models

This table instance can now be used to create a new model:

```javascript
   var myModel = myTable.newModel({
       first_name: "Donald",
       last_name: "Duck"
   });
   myModel.save().success(function () {...}).error(function () {...});
``` 


### Delete a model

Model instances can be removed from the table:

```javascript
  myModel.remove();
```


### Update a model

Model instances are automatically updated and saved when you change their property attributes:

```javascript
  myModel.set("first_name", "Daisy");
``` 


### Obtain a model by id

Model instances can be obtained from the table as follows:

```javascript
  myTable.findById(id).success(function (myModel) {
    ...
  }).error(function (error) {...});
```


### Obtain a single model by a query

Model instances can be obtained from the table as follows:

```javascript
  myTable.findBy({first_name: "Donald"}).success(function (myModel) {
    ...
  }).error(function (error) {...});
```


### Obtain multiple models by a query

Model instances can be obtained from the table as follows:

```javascript
  myTable.allBy(query, constraints).success(function (modelIterator) {
    ...
  }).error(function (error) {...});
```