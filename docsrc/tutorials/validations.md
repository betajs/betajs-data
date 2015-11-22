Validators allow you to add value validations to your model scheme that prevent invalid attributes from being saved to the store. You can add validators to your model scheme as follows:

```javascript
            _initializeScheme: function () {
                var scheme = inherited._initializeScheme.call(this);
                scheme.first_name = {
                    type: "string",
                    validate: new BetaJS.Data.Modelling.Validators.PresentValidator()
                };
                scheme.last_name = {
                    type: "string",
                    validate: new BetaJS.Data.Modelling.Validators.PresentValidator()
                };
                return scheme;
           }
```

The validate arguments admits both direct validator instances as well as an array of validator instances if you need to attach more than one validator.

The system currently supports the following validators:
- *PresentValidator*: ensures that the value is not null or empty
- *LengthValidator({min_length, max_length})*: ensures that the value is of a certain string length
- *EmailValidator*: ensures that the value is an email
- *UniqueValidator(key)*: ensures that the value is unique in the store
- *ConditionalValidator(condition, validator)*: ensures that a validator is valid given that the condition is satisfied