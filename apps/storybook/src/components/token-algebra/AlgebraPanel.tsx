import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { buildAlgebraScenario } from './algebra-model';
import type { AlgebraInputs } from './algebra-model';
import * as styles from './algebra-panel.css';
type Layout = {
    width: number;
    height: number;
};
export function AlgebraPanel({ nativeFontScale }: {
    nativeFontScale: number;
}) {
    const [foundation, setFoundation] = useState<AlgebraInputs['foundation']>('blue'), [space, setSpace] = useState<AlgebraInputs['space']>('srgb'), [ratio, setRatio] = useState<AlgebraInputs['ratio']>(1.25), [step, setStep] = useState<AlgebraInputs['step']>('title'), [unrelated, setUnrelated] = useState(false);
    const scenario = useMemo(() => buildAlgebraScenario({ foundation, space, ratio, step }), [foundation, space, ratio, step]);
    const [generatedLayout, setGeneratedLayout] = useState<Layout>(), [controlLayout, setControlLayout] = useState<Layout>();
    const observe = (set: (next: Layout | ((old: Layout | undefined) => Layout | undefined)) => void) => (event: LayoutChangeEvent) => { const { width, height } = event.nativeEvent.layout; set(old => old?.width === width && old.height === height ? old : { width, height }); };
    const button = (id: string, label: string, onPress: () => void) => <Pressable key={id} testID={'algebra-' + id} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.control}><Text allowFontScaling={false} style={styles.label}>{label}</Text></Pressable>;
    const telemetry = { selection: { foundation, space, ratio, step }, base: scenario.base, generated: scenario.generated, control: scenario.control, nativeFontScale, unrelated, layouts: { generated: generatedLayout, control: controlLayout } };
    return <View style={styles.panel}>
  <Text allowFontScaling={false} style={styles.heading}>Colour and typography algebra</Text>
  <View style={styles.row}>{button('foundation', foundation, () => setFoundation(v => v === 'blue' ? 'red' : 'blue'))}{button('space', space, () => setSpace(v => v === 'srgb' ? 'srgb-linear' : 'srgb'))}{button('ratio', 'Ratio ' + ratio, () => setRatio(v => v === 1.25 ? 1.5 : 1.25))}</View>
  <View style={styles.row}>{(['caption', 'body', 'title'] as const).map(v => button('step-' + v, v + (step === v ? ' selected' : ''), () => setStep(v)))}{button('unrelated', 'Unrelated ' + (unrelated ? 'on' : 'off'), () => setUnrelated(v => !v))}</View>
  <Text allowFontScaling={false} style={styles.label}>Generated / independent control</Text>
  {(['tint', 'replacement', 'attenuation'] as const).map(key => <View key={key} style={styles.row}><Text allowFontScaling={false} style={[styles.label, { width: 84 }]}>{key}</Text><View testID={'algebra-generated-' + key} accessible accessibilityLabel={'Generated ' + key} style={[styles.swatch, { backgroundColor: scenario.generated.colors[key] }]}/><View testID={'algebra-control-' + key} accessible accessibilityLabel={'Control ' + key} style={[styles.swatch, { backgroundColor: scenario.control.colors[key] }]}/></View>)}
  <Text key={'generated-' + nativeFontScale} testID="algebra-generated-text" allowFontScaling onLayout={observe(setGeneratedLayout)} style={[styles.sample, scenario.generated.metrics]}>Crumbs type</Text>
  <Text key={'control-' + nativeFontScale} testID="algebra-control-text" allowFontScaling onLayout={observe(setControlLayout)} style={[styles.sample, scenario.control.metrics]}>Crumbs type</Text>
  <Text testID="algebra-telemetry" accessibilityLabel={'M114:' + JSON.stringify(telemetry)} allowFontScaling={false} style={{ fontSize: 1, height: 2, color: '#111827' }}>M114</Text>
 </View>;
}
