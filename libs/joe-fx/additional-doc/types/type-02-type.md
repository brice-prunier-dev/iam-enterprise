# JOE type 101

```typescript
export interface BaseProperty {
  validate( target: any, action: ValidationAction, scope?: string | object | undefined, result?: ValidationResult ): ValidationResult;
  defaultValue(): any;
}

export interface BaseType extends BaseProperty {
  type: AnyTypeKey;
  title: string;
}
```

To make it simple, JOE's type relies on 2 properties and <s>two</s> three functions

Properties:

- type: _"string", "boolean", "number", "array"_ or _"object"_  -> JSON primitives,
- name: _Your type name_,

Functions:

- defaultValue(): _it can be either a constant or an accessor_ or undefined,
- validate( ... ): _Validation function_.
- __prepare( ... )__: _Enforce current type definition as metadata for the input `JSON ` instance;_

As for many ORM, JOE Types are plit in two:

## Scalar types

- [string](./types/string.md)
- [number](./types/number.md)
- [boolean](./types/boolean.md)
- [date](./types/date.md)

## Object types

- [object](./types/object.md)
- [array](./types/array.md)
- [map](./types/map.md)

## Core JOE Types defintions

- An Object type is either an array, a tuple, a map or a regular object.
- JOE Array is either a collection or a tuple.
  - JOE Array< T > is a collection of T where T is either a Scalar or an Object type.
  - JOE Array< T1, T2, ... TN > is a Tuple.
    - It is a fixed size array of N element.
    - Each element's type relies on its position
- JOE Map< T > is dictionnary of T.
  - T is either a Scalar or an Object type.
  - a Map is an object who's proterties are of the same type and their name as an index.
- Regular JOE's Object (aka Tobject) can get for properties any JOE Types
- Regular JOE's Object definition are paired  with a Typescript interface
  - the naming rule is
    - XxxType for JOE Type
    - XxxData for Typescript interface

```typescript

export const NameType: Tobject = t.object.as( {
    title: 'Name_T',
    properties: {
        firtName: t.string.word,
        lastName: t.string.word,
    },
    index: { id: ['firtName', 'lastName' ], sort: ['lastName', 'firstName' ] }
} );

export interface NameData {
    firstName: string;
    lastName: string;
}

```

## Core JOE Types priciples

- Each type is declared as a __const__ variable registered into `"t" namespace`.
  - A type definition is nothing else then an instance of one of the here above types.  
  - If necessary you can setup and register your type definition at runtime.
  - Registering each type definition in `"t" namespace` make it possible o retrieve a type by "name" .
  - `"t" namespace` expose some helper functions for each flavor of type.
  - [`<Link to "t" namespace...>`](./types/t.md).
- When a JOE Types __prepare(...)__ a JSON graph it links each instance of the JSON graph to a `DataInfo` instance through a `Symbol` property.
  - It turns an untyped javascript instance into a typed object.
  - Each instance `DataInfo` linked to an instance of the graph indicates its JOE type and give access to its parent element in the hierarchy ( _or itself when root_).
    - Doing so makes graph navigation bi-directionnal

![flow diagram](../images/joe-type.png)

