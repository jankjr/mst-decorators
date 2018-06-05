import { flow as mstflow } from 'mobx-state-tree';

import meta, { makeInit } from './meta';
import assert from './assert';
import { typeCheckReturnValue } from './types';
import { modelKey } from './symbols';
import { state } from './view';

const hooks = [
  'afterCreate',
  'afterAttach',
  'postProcessSnapshot',
  'beforeDetach',
  'beforeDestroy',
];

export const flow = function(fn) {
  return function(...args) {
    return mstflow(fn.bind(this))(...args);
  };
};

const makeMutation = returnTypeResolver => (proto, fieldName, desc) => {
  const initFunction = makeInit(desc);
  const mutationName = `mutation: ${proto.constructor.fieldName}.${fieldName}`;
  assert(initFunction, 'mutations may not be undefined');
  if (hooks.indexOf(fieldName) !== -1) {
    meta(proto.constructor, 'hooks', []).push(fieldName);
  }
  return {
    configurable: false,
    enumerable: false,
    writeable: false,

    initializer() {
      const mutationFunction = initFunction.call(this);
      assert(
        typeof mutationFunction === 'function',
        'type of mutation must be a function',
      );

      let boundMutation = mutationFunction.bind(this);
      if (returnTypeResolver) {
        boundMutation = typeCheckReturnValue(
          returnTypeResolver,
          boundMutation,
          mutationName,
        );
      }

      return (...args) => {
        assert(
          !state.currentlyInView,
          'Views may not call mutation functions.',
        );
        return this[modelKey].executeFunction(boundMutation, args);
      };
    },
  };
};

const mutationDecorator = (...args) => {
  if (args.length === 1) {
    return makeMutation(args[0]);
  }
  if (args.length === 3) {
    return makeMutation(null)(...args);
  }
  assert(
    false,
    'Invalid number of arguments supplied to the mutation decorator',
  );
};

export default mutationDecorator;
