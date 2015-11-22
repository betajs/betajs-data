Delegator Stores are Store classes that delegate calls to other, underlying stores while transforming the requests in different useful ways:

- *SimulatorStore*: Allows you to simulate the target store being online / offline.
- *ReadyStore*: Allows you to queue up and postpone calls to the target store until you acknowledge it to be ready to accept actual calls.
- *ResilientStore*: Allows you to automatically retry failed calls to the target store for a certain number of times.
- *TableStore*: Allows you to treat a Table as a Store.
- *TransformationStore*: Allows you to define mappings from and to the data scheme of the underlying store.
- *MultiplexerStore*: Allows you to route calls to a number of underlying stores, depending on the context.
- *ContextualizedStore*: Alows you to decode / encode contexts into calls to the underlying store.