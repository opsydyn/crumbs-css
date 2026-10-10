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
var publish = () => {
  for (const listener of listeners)
    listener();
};
var record = (kind) => {
  counts = Object.freeze({ ...counts, [kind]: counts[kind] + 1 });
  publish();
};
var getExtensionCounts = () => counts;
var subscribeExtensionCounts = (listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
function useReferenceObservation(baseStyle, props) {
  import_react.useEffect(() => record("mounts"), []);
  import_react.useEffect(() => {
    if (props.testID !== "extensions-generated-card")
      return;
    const rendered = import_react_native.StyleSheet.flatten([baseStyle, props.style]);
    const old = counts.rendered, keys = Object.keys(rendered);
    if (old && keys.length === Object.keys(old).length && keys.every((key) => Object.is(old[key], rendered[key])))
      return;
    counts = Object.freeze({ ...counts, rendered: Object.freeze({ ...rendered }) });
    publish();
  }, [baseStyle, props.style, props.testID]);
}
function createStyledView(baseStyle) {
  record("factories");
  return function StyledView(props) {
    useReferenceObservation(baseStyle, props);
    return import_react.createElement(import_react_native.View, { ...props, style: [baseStyle, props.style] });
  };
}
function createThemedView(baseStyle) {
  record("factories");
  return function ThemedView(props) {
    const resolved = import_core.useThemedStyle(baseStyle);
    useReferenceObservation(resolved ?? {}, props);
    return import_react.createElement(import_react_native.View, { ...props, style: [resolved, props.style] });
  };
}
