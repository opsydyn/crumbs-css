import { useCallback, useState, useSyncExternalStore } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { LayoutChangeEvent, ViewStyle } from 'react-native';
import { ThemeProvider, useTheme } from '@opsydyn/crumbs-css/theme/core';
import { getExtensionCounts, subscribeExtensionCounts } from './runtime';
import { extensionBaseMetrics, extensionControlStyle } from './extension-model';
import type { ExtensionSelection } from './extension-model';
import * as styles from './extension-panel.css';
type Layout = {
    width: number;
    height: number;
};
const overrideStyle = { backgroundColor: '#00aa00' } as const;
function ManualThemed({ selection, children, onLayout }: {
    selection: ExtensionSelection;
    children: React.ReactNode;
    onLayout: (event: LayoutChangeEvent) => void;
}) {
    const colors = useTheme<typeof styles.vars>().values;
    const color = colors.colors[selection.foundation];
    if (typeof color !== 'string')
        throw Error('Manual control requires a colour string');
    const base: ViewStyle = { backgroundColor: color, padding: 12, borderRadius: 8 };
    return <View testID="extensions-control-card" accessibilityLabel="Control card" accessible={false} onLayout={onLayout} style={[base, styles.card, selection.override && overrideStyle]}>{children}</View>;
}
export function ExtensionPanel({ nativeFontScale }: {
    nativeFontScale: number;
}) {
    const [foundation, setFoundation] = useState<ExtensionSelection['foundation']>('blue'), [mode, setMode] = useState<ExtensionSelection['mode']>('literal'), [theme, setTheme] = useState<ExtensionSelection['theme']>('light'), [override, setOverride] = useState(false), [unrelated, setUnrelated] = useState(false);
    const [actions, setActions] = useState({ generated: 0, control: 0 });
    const [layouts, setLayouts] = useState<Partial<Record<'generated' | 'control' | 'generatedCard' | 'controlCard', Layout>>>({});
    const counts = useSyncExternalStore(subscribeExtensionCounts, getExtensionCounts, getExtensionCounts);
    const selection = { foundation, mode, theme, override };
    const manual = extensionControlStyle(selection);
    const Card = mode === 'literal' ? (foundation === 'blue' ? styles.LiteralBlue : styles.LiteralRed) : (foundation === 'blue' ? styles.ThemedBlue : styles.ThemedRed);
    const observe = useCallback((kind: keyof typeof layouts) => (event: LayoutChangeEvent) => { const { width, height } = event.nativeEvent.layout; setLayouts(old => old[kind]?.width === width && old[kind]?.height === height ? old : { ...old, [kind]: { width, height } }); }, []);
    const button = (id: string, label: string, onPress: () => void) => <Pressable key={id} testID={'extensions-' + id} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.control}><Text allowFontScaling={false} style={styles.label}>{label}</Text></Pressable>;
    const children = (kind: 'generated' | 'control') => <><View testID={'extensions-' + kind + '-colour'} accessible accessibilityLabel={kind + ' colour'} style={styles.swatch}/><Text key={nativeFontScale} testID={'extensions-' + kind + '-text'} allowFontScaling onLayout={observe(kind)} style={styles.sample}>Crumbs type</Text><Pressable testID={'extensions-' + kind + '-action'} accessibilityRole="button" accessibilityLabel={kind + ' action'} onPress={() => setActions(old => ({ ...old, [kind]: old[kind] + 1 }))}><Text allowFontScaling={false} style={{ color: '#ffffff', fontSize: 12 }}>Action {actions[kind]}</Text></Pressable></>;
    const generated = <Card testID="extensions-generated-card" accessibilityLabel="Generated card" accessible={false} onLayout={observe('generatedCard')} style={[styles.card, override && overrideStyle]}>{children('generated')}</Card>;
    const control = mode === 'literal' ? <View testID="extensions-control-card" accessibilityLabel="Control card" accessible={false} onLayout={observe('controlCard')} style={[manual, styles.card]}>{children('control')}</View> : <ManualThemed selection={selection} onLayout={observe('controlCard')}>{children('control')}</ManualThemed>;
    const pair = <View style={styles.row}>{generated}{control}</View>;
    const telemetry = { schema: 'crumbs.m11.5.native-observation.v1', selection, base: extensionBaseMetrics, generated: counts.rendered, control: manual, counts: { factories: counts.factories, mounts: counts.mounts }, actions, nativeFontScale, unrelated, layouts };
    return <View style={styles.panel}><Text allowFontScaling={false} style={styles.heading}>Typed runtime components</Text><View style={styles.row}>{button('foundation', foundation, () => setFoundation(v => v === 'blue' ? 'red' : 'blue'))}{button('mode', mode, () => setMode(v => v === 'literal' ? 'themed' : 'literal'))}{button('theme', theme, () => setTheme(v => v === 'light' ? 'dark' : 'light'))}{button('override', 'Override ' + (override ? 'on' : 'off'), () => setOverride(v => !v))}{button('unrelated', 'Details ' + (unrelated ? 'on' : 'off'), () => setUnrelated(v => !v))}</View><Text allowFontScaling={false} style={styles.label}>Generated / independent control</Text>{mode === 'themed' ? <ThemeProvider theme={theme === 'light' ? styles.lightTheme : styles.darkTheme}>{pair}</ThemeProvider> : pair}<Text allowFontScaling={false} style={styles.label}>Factory calls {counts.factories}; selected mounts {counts.mounts}; details {unrelated ? 'shown' : 'hidden'}</Text><Text testID="extensions-telemetry" accessibilityLabel={'M115:' + JSON.stringify(telemetry)} allowFontScaling={false} style={{ fontSize: 1, height: 2, color: '#111827' }}>M115</Text></View>;
}
