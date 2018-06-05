This library is just an alternative way to write mst models.

Lets use the todo example from mst's github:
```js
const Todo = types.model("Todo", {
    title: types.string,
    done: false
}).actions(self => ({
    toggle() {
        self.done = !self.done
    }
}))
const Store = types.model("Store", {
    todos: types.array(Todo)
})
// create an instance from a snapshot
const store = Store.create({ todos: [{
    title: "Get coffee"
}]})

// listen to new snapshots
onSnapshot(store, (snapshot) => {
    console.dir(snapshot)
})

// invoke action that modifies the tree
store.todos[0].toggle()
```

This can be rewritten as:

```js
import { model, field, mutation } from "mst-decorators";
import { onSnapshot } from "mobx-state-tree";

@model
class Todo {
  @field(t => t.string) title = "";     // Nicer defaults syntax, no need for optional(string, "")
  @field(t => t.boolean) done = false;

  @mutation toggle() {
    this.done = !this.done; // 'this' points to the Todo class as expected.
  }
}

@model
class Store {
  // Parametric types work as expected.
  @field(t => t.array(Todo))
  todos = [
    {
      title: "get coffee" // Models can be initialized from snapshots
    },
    new Todo({
      title: "also works with initializing from class"
    })
  ];
}

const store = new Store();
// listen to new snapshots
onSnapshot(store, (snapshot) => {
    console.dir(snapshot)
})
store.todos[0].toggle();
```

The first argument of the type function (the `t => ...` inside the `@field`s) is essentially a special version of mst's types object.

It is only used to resolve the MST type of the models when using parametric types.

## Views

views almost look like `@computed` in mobx.

```js
import { model, view } from "mst-decorators";
@model
class Store {

  ...
  @view
  get numberOfTodos() {
    return this.todos.length;
  }
}
```
Any view defined as a `get`, are simply piped into `@computed`.

But unlike `@computed` that can only be defined as getters.

Views can be an arbitrary _pure_ (At least from MST's point of view) function, and will only recompute if either the arguments or the store state changes.

```js
import { model, view } from "mst-decorators";

@model
class Store {
  ...

  @view
  todosThatStartWith = substr => this.todos.filter(s => s.startsWith(substr));
}
...
store.todosThatStartWith("a"); // view function called
store.todosThatStartWith("a"); // previous result is returned
store.todosThatStartWith("b"); // view function called
store.todosThatStartWith("a"); // view function called
```
Beware, this is implmented creating an internal observable store for each `@view`. Then saving the calling current arguments into this internal observable store, arguments are only copied if the don't match by shallow comparison.

```js
@view vectorSum = v => v.x + v.y;
...
const v = {x:1, y:2}

vectorSum(v) // 3
v.x = 2;
vectorSum(v) // still 3

const v = observable({x:1, y:2})

vectorSum(v) // 3
v.x = 2;
vectorSum(v) // 4 as expected
```

If this bahaviour is not wanted, use a plain functions for querying data.

One last feature in this library is that the result of `@mutation` and `@view` can also be typed.

The syntax is exactly the same as with `@field`s and wraps the function typechecking the return value.

```js
@model
class Store {
  ...

  @view(t => t.array(Todo)) get finsihedTodos() {
    return this.todos.filter(t => t.done);
  }

  @view(t => t.array(Todo)) get unfinishedTodos() {
    return this.todos.filter(t => !t.done);
  }

  @mutation(t => t.number) removeFinishedTodosAndReturnNumberOfTodos() {
    const prevCount = this.todos.length;
    this.todos = this.finishedTodos();
    return prevCount - this.todos.length;
  }

  @view(t => t.boolean)
  get willFail() {
    return 42;
  }
}
```
### Inheiritance

Using class inheiritance does work, and will create a type composed from the parent class type, and the extending class type.

```js
@model
class Animal {
  @field(t => t.string)
  name = 'Animal';
  @field(t => t.string)
  sound = '...';

  @view(t => t.string)
  get talk() {
    return `${this.name} says ${this.sound}`;
  }
}

@model
class Cat extends Animal {
  @field(t => t.string)
  name = 'Cat';
  @field(t => t.string)
  sound = 'meow';
}

new Animal().talk; // => Animal says ...
new Cat().talk; // => Cat says meow
```

However, as with all OOP inheiritance. Use it when sparringly. 

### Lifecycle hooks

All mst functions work directly on instances of these classes like you would expect.

Model lifecycle hooks are defined as mutations.

The `preProcessSnapshot(...)` hook however must be defined as a static function.

This is only done to mimic `MST` own API.

```js
@model
class SerializeableFromString {
  static preProcessSnapshot = value => ({value});
  @mutation postProcessSnapshot = snapshot => snapshot.value;

  @field(t => t.string)
  value = null;
}

@model
class Usage {
  @field(t => SerializeableFromString)
  value = "";  
}
```

### Things to keep in mind.

Standard MST types do not play well with the class model types. There exists a utility function to extract the mst type from the class however.

```js
import { getType } from "mst-decorators";
getType(Store) => "Store {...}"
```

You can however use most already defined MST models in `(t => ...)`.

Fields must have a defined default RHS.

```
@field(t => t.number) notAllowed;
@field(t => t.number) allowed = 0;
```

The RHS of the equality is wrapped in a initializer that is only called if the value is not specified.

Views may not call `@mutation`. But you can probably find a way to make it happen.

You must mark the class with `@model`.

Please be careful about recursively calling between `@view`. 
