import { types as mstTypes, getSnapshot } from 'mobx-state-tree';
import { typeKey, modelKey } from './symbols';
import assert from './assert';

const types = {};
Object.keys(mstTypes).forEach(k => {
  types[k] = mstTypes[k];
  if (typeof types[k] === 'function') {
    types[k] = (...args) => {
      return mstTypes[k](...args.map(a => (a && a[typeKey]) || a));
    };
  }
});

types.late = lateFn => {
  return mstTypes.late(() => {
    const a = lateFn();
    return (a && a[typeKey]) || a;
  });
};

Object.freeze(types);
export const resolveType = resolveTypeFunction => {
  assert(
    typeof resolveTypeFunction === 'function',
    'Checked type resolver to be a function',
  );
  const t = resolveTypeFunction(types);
  return (t && t[typeKey]) || t;
};

const getValueTypeName = value => {
  return (
    (value && value.$treenode && value.$treenode.type.name) || typeof value
  );
};
export const typeCheckReturnValue = (resolveTypeFunction, fn, name) => {
  return (...args) => {
    const returnType = resolveType(resolveTypeFunction);
    const value = fn(...args);
    const errors = returnType.isValidSnapshot(
      (value && value[modelKey]) || value,
      [],
    );
    const noErrors = errors.length === 0;
    if (!noErrors) {
      console.log(errors);
      console.log(value);
    }
    assert(
      noErrors,
      `Invalid return type for '${name}'. Expected '${
        returnType.name
      }' got '${getValueTypeName(value)}'`,
    );
    return value;
  };
};

export default types;
