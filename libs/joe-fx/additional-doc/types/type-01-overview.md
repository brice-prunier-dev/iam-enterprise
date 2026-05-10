# JSON type in JOE

[__Prev...__](./index.md) 

## Why a new json type framework

When i started working with JSON i first try to rely on `Json Schema` but very fast i decided to have a loosely compliance with it:

- From an development perpective many features were out of scope or propose a complex implementation,
- Some core features were missing.

- `Json Schema` took the same `direction` that Xml Schemas did 20 years ago:
  - It targets `Document Definition` rather than an `Object Design`.

JOE Type framework doesn't rely on static definition.
It relies on a set of `JOE Type` class that are instanciated with a `Type Definition` model that is a `Json Schema` 

``` typescript
/**
 * Example of an Joe Number Type instanciate with an Integer Schema model 
 */
const Int = new Tnumber( {
    type: 'number',
    title: 'INT',
    pattern: NumberPattern.INT,
    default: 0,
    minimum: Number.MIN_SAFE_INTEGER,
    maximum: Number.MAX_SAFE_INTEGER,
});
```

## JOE Types

Joe `Types` follow `Json Schema` on core type typology:

- string
- number
- boolean
- object
- array

plus few extra types 

- date
- map

### JOE Types references

| JSON Type  | JOE Type |
| -----------  | ----------- |
| string       | Tstring     |
| bool         | Tbool       |
| number       | Tnumber     |
| object       | Tobject     |
| array        | Tarray      |
| map          | Tnumber     |
### JOE Type Index

Manipulation of instances collection is a basic task in data development:

- Sorting a collection according its entity type,
- Adding or removing an instance,
- Testing if an intance newlly created or is it comming from the store?
- ...

Those operation involved 3 features that `Json Schema` ignore or to be more exact 'consider as out of scope' when you need them almost everywhere in your code:

### ID / PK

**How i identify an `Element` ?**

This simple question is my main complain against `Json Schema`.  The concept of Document ID exists but it doesn't answer your needs when you are drilling down a `Domain Model` having children collection.

You need an index and that relies on key values and not a `record number`.

Having an `index` definition in an `Element Type` is mandatory as soon this type is used in a collection. Not only it is the `contract` to identify an instance within a list but it also the core logic that drive `JOE pointer` grammar (This concept may sound useless however a `Domain Model` relies on it to set the path of each element ).

As for SQL Database an `ìndex` can rely on one or few properties. However being on a `Element Model` means this/these property.ies can either be on your element or on a child instance.

Relying on a single 'Id' property is a too restrictive, many use case rely on more complex scenari: it may needs a `JSON pointer` grammar to define the `path` to their index property.ies.

*Examples*

> Take an `Employee Type` where employees are from all around the world. Its index should be the composition of

> - `.>society>ref`
> - `.>empId`

- *Two differrent society may use the same `empId` ( specially when it relies on a mix of firstname & lastname)*
- *`.>society>ref` is a pointer over the society `ref` property that makes the pair unique.

### Revision

By design a `Domain Model` may be updated.

Having a property that defines its version answer two fundemental use cases:

- Concurency update: is the version i read , the same than the one in database ?
- New Element identification: is an `Element` comming from the database or is it a new instance ?

Once again having this information in the `Element Type` seem mandatory in a developement perpective to simplify your code, it is not when your are targetting a `JSON Schema`.

### Default Sorting Strategy

As i said a `Domain Model` can include many inner list.

You don't master the way those elements are written in the `Domain Model` but you do need to read them correctly sorted.

Having a default sorting strategy on your `Element Type` is part of Joe Index defintion.
When you read an inner collection from an `Element View` it is by default sorted according the `Element Type`.


## JOE Type Default value

- On `View Element` when a property is blank but also required it returns a "default value" when defined.
- On `Object Mapping` the default value on a `Mandatory` field should be set when you create the instance. This default value is not alway a constant it can be a function. Take for example the the common "creationDate" property, you want to be able to set `now` as a default value.

 
 [__Next...__](./type-02-type.md).

