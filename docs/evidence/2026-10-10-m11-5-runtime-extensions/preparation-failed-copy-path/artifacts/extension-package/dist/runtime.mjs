// packages/css/fixtures/packed-distribution/extensions/src/runtime.tsx
import { createElement, useEffect } from "react";
import { View } from "react-native";
import { useThemedStyle } from "@opsydyn/crumbs-css/theme/core";
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
    useEffect(() => record("mounts"), []);
    return createElement(View, { ...props, style: [baseStyle, props.style] });
  };
}
function createThemedView(baseStyle) {
  record("factories");
  return function ThemedView(props) {
    const resolved = useThemedStyle(baseStyle);
    useEffect(() => record("mounts"), []);
    return createElement(View, { ...props, style: [resolved, props.style] });
  };
}
export {
  createStyledView,
  createThemedView,
  getExtensionCounts,
  subscribeExtensionCounts
};
