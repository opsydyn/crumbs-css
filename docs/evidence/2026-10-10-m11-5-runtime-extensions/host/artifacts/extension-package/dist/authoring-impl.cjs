var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toCommonJS = (from) => {
  var entry = (__moduleCache ??= new WeakMap).get(from), desc;
  if (entry)
    return entry;
  entry = __defProp({}, "__esModule", { value: true });
  if (from && typeof from === "object" || typeof from === "function") {
    for (var key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(entry, key))
        __defProp(entry, key, {
          get: __accessProp.bind(from, key),
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
        });
  }
  __moduleCache.set(from, entry);
  return entry;
};
var __moduleCache;
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};

// packages/css/fixtures/packed-distribution/extensions/src/authoring.ts
var exports_authoring = {};
__export(exports_authoring, {
  pureFunction: () => pureFunction,
  styledView: () => styledView,
  themedView: () => themedView
});
module.exports = __toCommonJS(exports_authoring);
var import_extensions = require("@opsydyn/crumbs-css/extensions");
var native = import_extensions.defineExtension();
var styledView = native.factory({ importPath: "@acme/crumbs-extensions/runtime", importName: "createStyledView" });
var themedView = native.factory({ importPath: "@acme/crumbs-extensions/runtime", importName: "createThemedView" });
var pureFunction = import_extensions.defineExtension().factory({ importPath: "@acme/crumbs-extensions/pure-runtime", importName: "make" });
