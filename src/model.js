import { types, typecheck, getParent as mstGetParent } from 'mobx-state-tree';

import { modelKey, typeKey, classKey } from './symbols';
import meta from './meta';
import { resolveType } from './types';

// Sadly the only way I could find to keep the `this` keyword intact, but
// allowing the mutation to behave like an action from mst's point of view.
const executeFunction = { executeFunction: (fn, args) => fn(...args) };
const defaultActions = () => executeFunction;

export const getParent = inst => {
  const p = mstGetParent(inst);
  if (p && p[classKey]) return p[classKey];
  return p;
};
const constructMstModel = (name, fields, preProcessSnapshot, parentType) => {
  let mstType = types.model(name, fields);
  mstType = mstType.actions(defaultActions);
  if (preProcessSnapshot) {
    mstType = mstType.preProcessSnapshot(preProcessSnapshot);
  }
  if (parentType) {
    return types.compose(parentType, mstType);
  }
  return mstType;
};

const modelBase = (Cls, resolveTypeFn) => {
  const parentType = Cls[typeKey];
  const fields = meta(Cls, 'fields', []);
  const hooks = meta(Cls, 'hooks', []);
  const mstModelFields = {};

  fields.forEach(({ fieldName, resolveTypeFunction }) => {
    mstModelFields[fieldName] = resolveTypeFn(resolveTypeFunction);
  });
  let mstType = constructMstModel(
    Cls.name,
    mstModelFields,
    Cls.preProcessSnapshot,
    parentType,
  );

  hooks.forEach(hook => {
    mstType = mstType.actions(self => ({
      [hook]: (...args) => self[classKey][hook](...args),
    }));
  });

  let currentInst = null;
  Cls = class extends Cls {
    constructor(values, env, dontInit) {
      super(values, env, true);
      if (dontInit) {
        return;
      }
      currentInst = this;
      mstType.create(values, env);
    }
    static describe = () => mstType.describe();
    toString() {
      return this[modelKey].toString();
    }
  };

  const { instantiate, finalizeNewInstance } = mstType;
  mstType.instantiate = (a, b, env, values) => {
    const v = instantiate.call(mstType, a, b, env, values);
    if (currentInst) {
      v.storedValue = currentInst;
      currentInst = null;
    }
    return v;
  };
  mstType.finalizeNewInstance = (node, values) => {
    if (!currentInst) {
      currentInst = new Cls(null, null, true);
    }
    node[classKey] = currentInst;
    node.storedValue[classKey] = currentInst;

    const modelInstance = node.storedValue;
    currentInst.$mobx = modelInstance.$mobx;
    currentInst.$treenode = modelInstance.$treenode;
    currentInst.$treenode[modelKey] = currentInst;
    currentInst[modelKey] = modelInstance;
    currentInst[typeKey] = mstType;
    return finalizeNewInstance.call(mstType, node, values);
  };

  Cls[typeKey] = mstType;

  return Cls;
};

export const parametric = fn => Cls => {
  const params = fn();
  const paramNames = Object.keys(params);
  const cache = {};

  function resolver(...args) {
    args = args.map((f, i) => {
      const t = resolveType(f);
      params[paramNames[i]] = t;
      return t;
    });

    const key = `<${args.map(a => a.describe).join(', ')}>`;
    if (!cache[key]) {
      cache[key] = modelBase(Cls, rf => rf(params) || resolveType(rf));
    }
    return cache[key];
  }
  resolver.describe = () => `{ ${paramNames.join(', ')} }`;
  return resolver;
};

export const getType = Cls => Cls[typeKey];
const model = Cls => modelBase(Cls, resolveType);

export default model;
