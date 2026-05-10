# JOE View Element

## Lexicon

> `View Element`: kind of  typed `proxy` over a `JSON` element.
>

## View Element role

Joe-fx includes many features but all of them are the result of one single goal:

**Being able to turn a `JSON graph` statically typed  as `T` into a `View Element` class also typed as `T` but having the following feature:**

- Customization:
  - a `JSON element` is a pure data object (aka DTO) however `Business Model` often requires specialized functions to read or write data.
  - `View Element` is the place to declare these specific methods or properties.
  - It can extend 3 types of `Core View Element`:

    - Objview<T>: the `JSON instance` source is an object implementing T,
    - Setview<T>: the `JSON instance` source is an array of T,
    - Mapview<T>: the `JSON instance` source is a dictionnary of T,

- `Type Element` validation
  - Validation relies on a `Type Element` definition (Cf. enhanced Json Schema ) that matches `T` Typescript interface.
  - For performance reason `Validation` can be scoped to a single property change or to the global state.

- `Element Model` serialization 
  - Dispite the fact that a any `View Element` can be enhanced with custom functions and properties,
  a `View Element` expose an $json() function that return its current state as a pure `JSON graph` matching `T` interface.

- `ChangeSet` management:
  - As long a property is unchanged a `View Element` reads the value on its _source_  (`JSON instance`),
  - As soon a `View Element` is editing it expose an `$editor` that publish all properties & behaviours needed by an edition.
    - Once a property is modified its new value is spare at the `View Element Editor` level.
    - On `endEdit()` or `cancelEdit()` the  `Editor` is released what free all resources used for edition 
      - NB: On `endEdit()` all the changes are apply to  the _source_  (`JSON instance)`


## Summary

The `View Architecture` has a low memory footprint because it is not `cloning` the existing `JSON Graph`, it just create a `View of T` as a `Proxy`.

- On a `View Model` creation only the root element is instanciated, all children `View Elements ` are instanciated upon `Graph navigation`.

_A common pattern with JOE is to manage `List of T` as `JSON array` and use a `View of T` for detail use case._

 
 [__Next...__](./joe-view-element.html)
