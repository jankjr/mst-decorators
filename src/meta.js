const map = new Map();

const getMeta = (Cls, key, init) => {
  if (!map.has(Cls)) {
    map.set(Cls, {});
  }
  const metaData = map.get(Cls);
  if (!metaData[key]) {
    metaData[key] = init;
  }
  return metaData[key];
};

export const makeInit = desc =>
  desc.initializer || (desc.value && (() => desc.value));

export const fieldDecorator = fn => (proto, name, desc) =>
  fn(proto.constructor, name, makeInit(desc), desc);

export default (Cls, key, init) => getMeta(Cls, key, init);
