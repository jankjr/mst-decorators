import meta, { fieldDecorator } from './meta';
import { modelKey, classKey } from './symbols';
import assert from './assert';

const base = resolveTypeFunction => {
  assert(resolveTypeFunction, 'Untyped fields are not supported at the moment');
  return fieldDecorator((Cls, fieldName, initializer, desc) => {
    assert(
      !(desc.get || desc.set),
      `Getters/setters are not supported for @field's.`,
    );
    let typeFn = resolveTypeFunction;
    if (initializer) {
      typeFn = t => t.optional(resolveTypeFunction(t), initializer);
    }
    meta(Cls, 'fields', []).push({
      fieldName,
      resolveTypeFunction: typeFn,
      initializer,
    });

    return {
      enumerable: false,
      configurable: false,
      get() {
        const c = this[modelKey][fieldName];
        if (c && c[classKey]) {
          return c[classKey];
        }
        return c;
      },
      set(v) {
        this[modelKey][fieldName] = v;
      },
    };
  });
};

function makeField(resolveTypeFunction) {
  return base(resolveTypeFunction);
}

makeField.nullable = resolveTypeFunction =>
  base(t => t.maybe(resolveTypeFunction(t)));

export default makeField;
