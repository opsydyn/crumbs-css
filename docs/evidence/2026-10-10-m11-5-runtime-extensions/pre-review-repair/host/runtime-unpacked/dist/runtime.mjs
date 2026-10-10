// packages/css/fixtures/packed-distribution/extensions/src/runtime.tsx
import { createElement, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { useThemedStyle } from "@opsydyn/crumbs-css/theme/core";
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
  useEffect(() => record("mounts"), []);
  useEffect(() => {
    if (props.testID !== "extensions-generated-card")
      return;
    const rendered = StyleSheet.flatten([baseStyle, props.style]);
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
    return createElement(View, { ...props, style: [baseStyle, props.style] });
  };
}
function createThemedView(baseStyle) {
  record("factories");
  return function ThemedView(props) {
    const resolved = useThemedStyle(baseStyle);
    useReferenceObservation(resolved ?? {}, props);
    return createElement(View, { ...props, style: [resolved, props.style] });
  };
}
export {
  createStyledView,
  createThemedView,
  getExtensionCounts,
  subscribeExtensionCounts
};
