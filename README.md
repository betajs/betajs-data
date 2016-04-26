# betajs-data 1.0.29
[![Build Status](https://api.travis-ci.org/betajs/betajs-data.svg?branch=master)](https://travis-ci.org/betajs/betajs-data)
[![Code Climate](https://codeclimate.com/github/betajs/betajs-data/badges/gpa.svg)](https://codeclimate.com/github/betajs/betajs-data)


BetaJS-Data is a general-purpose JavaScript framework for handling RESTful operations and ActiveRecord abstractions.



## Getting Started


You can use the library in the browser, in your NodeJS project and compile it as well.

#### Browser

```javascript
	<script src="betajs/dist/betajs.min.js"></script>
	<script src="betajs-data/dist/betajs-data.min.js"></script>
``` 

#### NodeJS

```javascript
	var BetaJS = require('betajs/dist/beta.js');
	require('betajs-data/dist/betajs-data.js');
```

#### Compile

```javascript
	git clone https://github.com/betajs/betajs-data.git
	npm install
	grunt
```



## Basic Usage


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



## Links
| Resource   | URL |
| :--------- | --: |
| Homepage   | [http://betajs.com](http://betajs.com) |
| Git        | [git://github.com/betajs/betajs-data.git](git://github.com/betajs/betajs-data.git) |
| Repository | [http://github.com/betajs/betajs-data](http://github.com/betajs/betajs-data) |
| Blog       | [http://blog.betajs.com](http://blog.betajs.com) | 
| Twitter    | [http://twitter.com/thebetajs](http://twitter.com/thebetajs) | 



## Compatability
| Target | Versions |
| :----- | -------: |
| Firefox | 4 - Latest |
| Chrome | 15 - Latest |
| Safari | 4 - Latest |
| Opera | 12 - Latest |
| Internet Explorer | 6 - Latest |
| Edge | 12 - Latest |
| iOS | 7.0 - Latest |
| Android | 4.0 - Latest |
| NodeJS | 0.10 - Latest |


## CDN
| Resource | URL |
| :----- | -------: |
| betajs-data.js | [http://cdn.rawgit.com/betajs/betajs-data/master/dist/betajs-data.js](http://cdn.rawgit.com/betajs/betajs-data/master/dist/betajs-data.js) |
| betajs-data.min.js | [http://cdn.rawgit.com/betajs/betajs-data/master/dist/betajs-data.min.js](http://cdn.rawgit.com/betajs/betajs-data/master/dist/betajs-data.min.js) |
| betajs-data-noscoped.js | [http://cdn.rawgit.com/betajs/betajs-data/master/dist/betajs-data-noscoped.js](http://cdn.rawgit.com/betajs/betajs-data/master/dist/betajs-data-noscoped.js) |
| betajs-data-noscoped.min.js | [http://cdn.rawgit.com/betajs/betajs-data/master/dist/betajs-data-noscoped.min.js](http://cdn.rawgit.com/betajs/betajs-data/master/dist/betajs-data-noscoped.min.js) |


## Unit Tests
| Resource | URL |
| :----- | -------: |
| Test Suite | [Run](http://rawgit.com/betajs/betajs-data/master/tests/tests.html) |


## Dependencies
| Name | URL |
| :----- | -------: |
| betajs | [Open](https://github.com/betajs/betajs) |


## Weak Dependencies
| Name | URL |
| :----- | -------: |
| betajs-scoped | [Open](https://github.com/betajs/betajs-scoped) |


## Contributors

- Oliver Friedmann


## License

Apache-2.0


