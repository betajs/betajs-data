The *RemoteStore* implements a RESTful access to a server-side store. It can be instantiated as follows:

```javascript
  var store = new BetaJS.Stores.RemoteStore(ajax, restOptions, storeOptions);
```

Here, ``ajax`` needs to be an instance of ``BetaJS.Net.AbstractAjax``, e.g. ``BetaJS.Browser.JQueryAjax`` if operated within the context of a browser.

Second, ``restOptions`` is a JSON object accepting the following optional configuration parameters:
- *methodMap*: an associative map, mapping all store primitives to http methods
- *toMethod*: a function, mapping store primitives to http methods
- *dataMap*: an associative map, mapping all store primitives to functions returning POST data
- *toData*: a function, mapping store primitives to POST data
- *getMap*: an associative map, mapping all store primitives to functions returning GET data
- *toGet*: a function, mapping store primitives to GET data
- *baseURI*: the base URI for all REST calls
- *uriMap*: an associative map, mapping all store primitives to functions returning the uri postfix
- *toURI*: a function, mapping store primitives to the uri postfix
