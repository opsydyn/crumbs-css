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

// packages/css/fixtures/packed-distribution/extensions/src/runtime.tsx
var exports_runtime = {};
__export(exports_runtime, {
  createStyledView: () => createStyledView,
  createThemedView: () => createThemedView,
  getExtensionCounts: () => getExtensionCounts,
  subscribeExtensionCounts: () => subscribeExtensionCounts
});
module.exports = __toCommonJS(exports_runtime);
var import_react = require("react");
var import_react_native = require("react-native");
var import_core = require("@opsydyn/crumbs-css/theme/core");
var counts = Object.freeze({ factories: 0, mounts: 0 });
var listeners = new Set;
var record = (kind) => {
  counts = Object.freeze({ ...counts, [kind]: counts[kind] + 1 });
  for (const listener of listeners)
    listener();
};
var getExtensionCounts = () => counts;
var subscribeExtensionCounts = (listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
function createStyledView(baseStyle) {
  record("factories");
  return function StyledView(props) {
    import_react.useEffect(() => record("mounts"), []);
    return import_react.createElement(import_react_native.View, { ...props, style: [baseStyle, props.style] });
  };
}
function createThemedView(baseStyle) {
  record("factories");
  return function ThemedView(props) {
    const resolved = import_core.useThemedStyle(baseStyle);
    import_react.useEffect(() => record("mounts"), []);
    return import_react.createElement(import_react_native.View, { ...props, style: [resolved, props.style] });
  };
}
