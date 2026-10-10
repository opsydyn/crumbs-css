// packages/css/fixtures/packed-distribution/extensions/src/pure-runtime.ts
var calls = [];
function make(...args) {
  calls.push({ argc: arguments.length, thisValue: this, args });
  return function suppliedArguments() {
    return args;
  };
}
export {
  calls,
  make
};
