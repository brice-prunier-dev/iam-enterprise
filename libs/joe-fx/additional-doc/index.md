# @Why JOE Framework

## Lexicon

> `JOE`: Javascript Object Element.
>
> `JSON`: Javascript Object Notation.
>
> `JSON Model`: Root Element of JSON data structure.
>
> `JSON Element`: JSON data structure that compose a JSON Model (Ex. Any Child item).
>
> `Domain Model` (aka `Model` as short name): `JSON Model` that defines a Business/Functional domain.
>
> `Domain Element` (aka `Element` as short name): Entity that compose a `Domain Model`.
>
> `Element Type`: Type definition of a `Domain Element`.
>
> `Model Type`: it is the `Element Type` related to the root `Domain Element`.
>
> `Change Operation`: Modification done on an `JSON Element`.
>
> `ChangeSet`: Array of `Change Operation` that occured between two state.

## JOE's origin

Typescript offers a clean way to enforce "static type definition" in javascript. With few Types definitions, an anonymous `JSON` variable can be turned into an a strongly typed data model.

In a read only world it will fullfils most of your needs, how ever a most of applications need to create, update or delete `Domain Models`...

Managing `Business Model` requires quite more than "static typing":

### Type Validation

- At first sight you may think that Model's validation can be solved by Typescript `Static typing` (_Cf. property type & required_). It is wrong ... it is quite more:
  - For examples:
    - A string property should be 2 chars **min** ,50 chars **max** and only **alpha** chars.
    - A Date property should have today as default value,
    - An Array property should get one item minimum,
    - A Dictionary property should get at least a `"main"` key entry,
    - A period property should enforce that `start date` is lower than `end date`,
    - An Array property have its items count constraint by an other other property of the `Model`,
    - A property name has to be unique in the database.
    -- ...
- You can't solve those with `Static typing` you need a `Model Type` to enforce all the constraints releated to a `Domain Model`.
- **Validation** is not just validating a `Model`:
  - it should work with background code as on an **User Interface**,
  - it should expose a `Validation state` you can easily  use in your code as on your User Interface:
    - It should be fast:
      - An user interface requires to display an up to date **Validation state** on any character change requires: You should have **Validation strategy** that optimize your validation process to compute the stric minimun.
      - Your `Validation state` should comply with your `Model hierarchy`!
        - All along this tutorial i will remind you that `Domain Model` are not simple record but complex data hierarchy...
  - If you look closer to the `Validation Process` you realize that it is a 3 steps process where stepping to the next level is only possible when the previous one is OK :
    1. `Type Model Validation` (Type definition enforcement),
    2. `Business Model Validation` (Business Model logic enforcement),
    3. `Repository Validation` (Contextual | External logic enforcement - Async).

### Entity Index

Being able to identify an `Model instance` is one of the first feature you face when you are dealing with `Domain Models`:

- `Model identity` is a core requirement for back-office applications:

Retrieving an **instance** in collection can't rely on a **positional index** because it is'nt a reliable information:

- Any 'insert', 'delete' or 'sort' operations can invalidate a **positional index** you have spared,

`Element Type definition` should provide an `Index` section to specify on what property.ies are relevant to identify an `Element instance`  .

### JSON pointer

Very few `Domain Model` are pure standalone Model. Most of them needs a reference(s) on an external or internal `Domain Element`.

- Those references not always target the root element of an `Domain Model`. Having an `Domain Model` Id is not enougth you also need to specify what `Domain Element` you are targetting into this `Domain Model`.

Beeing able to specify the `path` of an `Element` independently of any `positional index` requires a specific grammar that unfortunately is not existing in the current JSON Path specifications.

JOE brings an solution to this question.

### ChangeSet

Editing a `Model` is a long and complex process:

- It can be done on an UI, by code or via a mix of the two,
- It implies two states of your `Domain Model`:
  - The original version ( -> What JOE's calls source `JSON Element`),
  - The one you display and edit ( -> What JOE's calls a `View Element`).
- The `View Element` enforce a `ChangeSet` that reflect all the changes you are editing,
  - You can't rely on an afterward "Diff" to get it
    - First it is too heavy to be applied on an UI where it can be compute on any character change...
    - At last a blind "Diff" can produce errors:
      - On `Complex Model` changing an element of the hierarchy by an other is quite different from what a diff will produce...
- The `ChangeSet` should never be committed before backend reconciliation have been completed, what ever is your `Model`` complexity.
- Saving a `Model` can either rely on the current JSON of the `Model` or on its changeset if you need to
    master change's inpact.

### Data Model Architecture

Handling `Domain Models` implies many class declarations.

- The `Static Type` definitions required by the `Model`,
- The `Element Types` that handle validation of each `Element`,
- The `View Element` that enforce the editing and business logic of each `Data Element`,

The more complex is your `Model` the more declaration is required.
The same goes for `Business Rules`:

- Being able to write the right `code` on the right class is a core requirement of **SOLID** programming.
- Having a `Domain Model` well build make your code simpler and more evolutive: all you need is provided by your `Model`.

### ViewModel and Application Architecture

Designing `Domain Model` with an editiong logig is a first challenge but there is a second one:

Managing the `Domain Model` `Life Cycle`:

- When should it be loaded,
- When should it be released,
- When has the `Model` changed...

Despite all the custom code you can set on an `Element View` to enhance data manipulation you need a class that expose the `Domain Model` and enforce its `Life Cycle` logic.

That class is called `ViewModel` (-> Standard pattern) and its main roles are

- Properties:

  - **View** -> Publish the root `View Element` of the `Domain Model` it manage,
  - **ViewAsync** -> Publish a Promise on the root `View Element` of the `Domain Model`,
  - **View Model identity** -> Expose an identity to retrieve it (a set of _key value_),
  - **Dependencies** -> Declare required external `ViewModels` (Ex. Reference Table),
  - **Loaded** -> Flag indicating that the `View` is loaded,
  - **Running** -> Flag indicating a process is running,
  - **Editing** -> Flag indicating the **View** touched,
  - **Last Error** -> Error relative to the last action,
        ...

- Behaviours:
  - Loading the `View`
  - Saving the `View`
  - All Custom Operations / Rules releated to the the `View`

NB: The code that rules the `Life Cycle` of `Domain Model` should never be implemented in an UI Component neither a static service ( -> the number of `ViewModel` instantiated at runtime depends upon Navigation).

- the role of an UI Page is to retrieve from `Navigation` all the `View Models` it needs to manage its UI bindings. It should never manipulate a `Domain Model` -> it is the role of the `View Models`.

An other asset of `ViewModel` framework is to be compliant with Modern UX as `Context Switching`:

- **Never** an application should `block` an user to leave an editing form under the penalty of to loosing its changes...
- neither you should lost your scrolling state when you just want to make a round trip to a detail page...

`ViewModel` framework allow to spare and share `Domain Model` state acrros all components or controls.

`ViewModel Life cycle` is more than a simple `Store management` or `Reference counting` (aka smart pointer):

- `ViewModel` framework manage `Dependencies Life Cycle` on other `ViewModel`,
- A `ViewModels` stay alive when
  - it is the current `ViewModels`
  - or it is in editing mode
  - or it is the dependency of an alive `ViewModels`
  - or it's `Lease date` is still valid

## Summary

JOE is not dependend to a specific UI Framework as Angular, React or Vue: Its runtime is standalone.

At first, JOE has been trainned on Angular but React and Vue should match as well.

Some of you may be disapointed by the use of `ViewModel` or `Statefull` pattern. However i've been on the field for a while and as many i did `Redux & Immutable`... My feedback on those is: **what's the use ?**

`Redux & Immutable` introduce a useless complexity case without tacking the global picture.

My purpose is not `Redux & Immutable` bashing but why you never see demo real case demo: 
- complex model ( hierarchy of data having list of list) 
- complex business rule relying
- ChangeSet management,
- live cycle management ( over the model itself  and its dependencies)
- iring common implementation on UI and code action...*

Why... because half of the features you'll need do not comply with Redux & Immutable.

- Validation
- ChangeSet
- Business beaviour
- Transient property
- External reference

I don't say `Redux & Immutable` can not work but it exists simpler and more efficient pattern to manage `Domain Models` in an app.

All the critics i've read on `ViewModel` or `Statefull` pattern come from persons that don't know how to  correctly implement these patterns.

- Do you think it is different for `Redux & Immutable`!

JOE is not only a framework that brings technical solution to data management but it also propose an architecture to organize your code and tackle `Business Complexity` in a Single Page Application:

- **Resolver** handle Navigation to inject the `ViewModels` required by an UI Component,
- **ViewModel** manage and publish `Domain Model` 
  - life cycle,
  - loading,
  - saving,
  - validation
  - business logic
  - External dependencies: Ex `Reference table`
  - ...
- **View Element** implement `Domain Model` editing & runtime behaviour

NB: On Angular, JOE allows UI Component to use  on `On push` Change detection to optimize rendering engine:

- A ViewModel publish an 'onStateChange' observable for UI Component to re render its DOM.

- At last a a `Business Context` can be an `hierarchy` of `View Model` as `Business Domain` can be an `hierarchy` of `View Element`.

Let me tell you a real case story to illustrate JOE

_I've worked on `Gaz business` where a `Customer contract` relies on `Core Corporate Contract`, the `Customer contract` by itself was 4 levels deep hierarchy having multiple branch including a list of formula that can override parts of the `Core Corporate Contract` ones. Each formula has a list of parameters which unit may not match the `Customer contract` Units (those were inputs value or inherited value from `Core Corporate Contract`) in this case a convertion had to be applied. The final goal of a `Customer contract`all was to valuate a deal ._

_On the UI the end user was editing the `Customer contract` parameters and running simulation to define the right set of formulas that defined the deal, errors were computed live, any action should be cancelable. During a simulation the end user should be able to make round trip to other contract to check other formulas without loosing its inputs..._

_When an external formula was interesting, the user could import it into its `Customer contract` and you should be able to create part of the contract by code._

Joe implementation was tricky but the achitecture was clear:

- The `Customer contract` View Model had following dependencies
   - `Core Corporate Contract` View Model
   - `Currency Converter Referential` View Model
   - `Mollecule Converter Referential` View
   - `Currency Convertion Rate Timeseries`
   - `Mollecule index Timeseries` View Model

Beside the basic `View Model` behaviours, the `Customer Contract` View Model was implementing two business feature across all its dependencies:

- Publish a `Customer Contract View` that merged the `Core Corporate Contract` with the current `Customer contract` overrides.
- Valuate the `Customer Contract Deal' with the into the contract unitis over the contract periods.


[**Next...**](./why-joe/joe-view.html)
