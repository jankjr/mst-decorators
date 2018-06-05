export default (cond, str) => {
  if (!cond) throw new Error(str);
};
