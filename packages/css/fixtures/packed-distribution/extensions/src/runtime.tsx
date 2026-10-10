import { createElement, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import type { ViewProps, ViewStyle } from 'react-native';
import { useThemedStyle } from '@opsydyn/crumbs-css/theme/core';
export type ExtensionCounts = Readonly<{
    factories: number;
    mounts: number;
    rendered?: Readonly<ViewStyle>;
}>;
let counts: ExtensionCounts = Object.freeze({ factories: 0, mounts: 0 });
const listeners = new Set<() => void>();
const publish = () => { for (const listener of listeners)
    listener(); };
const record = (kind: 'factories' | 'mounts') => { counts = Object.freeze({ ...counts, [kind]: counts[kind] + 1 }); publish(); };
export const getExtensionCounts = () => counts;
export const subscribeExtensionCounts = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
// Reference-only instrumentation observes the actual style after React commits.
// Compiler argument snapshots and factory construction remain module-scoped.
function useReferenceObservation(baseStyle: ViewStyle, props: ViewProps) {
    useEffect(() => record('mounts'), []);
    useEffect(() => {
        if (props.testID !== 'extensions-generated-card')
            return;
        const rendered = StyleSheet.flatten([baseStyle, props.style]);
        const old = counts.rendered, keys = Object.keys(rendered) as (keyof ViewStyle)[];
        if (old && keys.length === Object.keys(old).length && keys.every(key => Object.is(old[key], rendered[key])))
            return;
        counts = Object.freeze({ ...counts, rendered: Object.freeze({ ...rendered }) });
        publish();
    }, [baseStyle, props.style, props.testID]);
}
export function createStyledView(baseStyle: ViewStyle) {
    record('factories');
    return function StyledView(props: ViewProps) { useReferenceObservation(baseStyle, props); return createElement(View, { ...props, style: [baseStyle, props.style] }); };
}
export function createThemedView(baseStyle: ViewStyle) {
    record('factories');
    return function ThemedView(props: ViewProps) { const resolved = useThemedStyle(baseStyle); useReferenceObservation(resolved ?? {}, props); return createElement(View, { ...props, style: [resolved, props.style] }); };
}
