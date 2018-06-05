import { computed, observable, action } from 'mobx';
import { typeCheckReturnValue } from './types';
import { makeInit } from './meta';
import assert from './assert';

export const state = {
  currentlyInView: false,
};

const memorizedViewFunction = (functionThis, viewFunction) => {
  const currentArguments = observable([]);
  const computedValue = computed(() => {
    state.currentlyInView = true;
    const currentValue = viewFunction.apply(functionThis, currentArguments);
    state.currentlyInView = false;
    return currentValue;
  });

  return action((...args) => {
    for (var i = 0; i < args.length; i++) {
      const arg = args[i];
      if (i > currentArguments.length) {
        currentArguments.push(arg);
      } else if (currentArguments[i] !== arg) {
        currentArguments[i] = arg;
      }
    }

    return computedValue.get();
  });
};

const makeView = returnTypeResolver => (protoType, fieldName, desc) => {
  const viewName = `${protoType.constructor.name}.${fieldName}`;

  if (desc.get) {
    let get = t => {
      state.currentlyInView = true;
      const value = desc.get.call(t);
      state.currentlyInView = false;
      return value;
    };

    if (returnTypeResolver) {
      get = typeCheckReturnValue(returnTypeResolver, get, `get ${viewName}`);
    }

    return computed(protoType, fieldName, {
      configurable: false,
      enumerable: false,
      set: desc.set,
      get() {
        return get(this);
      },
    });
  }

  const initializer = makeInit(desc);
  assert(typeof initializer === 'function', `${viewName} must be defined`);

  return {
    configurable: false,
    enumerable: false,
    writeable: false,
    initializer() {
      let viewFunction = initializer.call(this);
      assert(
        typeof viewFunction === 'function',
        `${viewName} must be a function`,
      );
      viewFunction = viewFunction.bind(this);

      if (returnTypeResolver) {
        viewFunction = typeCheckReturnValue(
          returnTypeResolver,
          viewFunction,
          viewName,
        );
      }
      const memorizedState = memorizedViewFunction(this, viewFunction);

      return memorizedState.call;
    },
  };
};

const viewDecorator = (...args) => {
  if (args.length === 1) {
    return makeView(args[0]);
  }
  if (args.length === 3) {
    return makeView(null)(...args);
  }
  assert(false, 'Invalid number of arguments supplied to the view decorator');
};

export default viewDecorator;
