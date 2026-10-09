import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import type { LayoutChangeEvent, ViewStyle } from 'react-native';
import { Portal, PortalHost } from '@rn-primitives/portal';
import { ContainerProvider, useContainerLayout, useContainerValue } from '@opsydyn/crumbs-css/theme/containers';
import { cardDefinition, regionDefinition, cardHeightDefinition } from './container-definitions';
import { initialContainerScenario, updateContainerScenario } from './container-model';
import type { ContainerAction, ContainerScenario } from './container-model';
import * as s from './container-panel.css';
const layoutValues = Object.freeze({ unmeasured: s.column, narrow: s.column, wide: s.row }), bucketValues = Object.freeze({ unmeasured: 'unmeasured', narrow: 'narrow', wide: 'wide' });
type Report = (id: string, data?: Record<string, unknown>) => void;
type Geometry = Readonly<{
    x: number;
    y: number;
    width: number;
    height: number;
}>;
function CardContent({ id, measured, events, nested, report, portal = 'closed' }: {
    id: string;
    measured: Geometry | undefined;
    events: number;
    nested: boolean;
    report: Report;
    portal?: ContainerScenario['portal'];
}) {
    const selected = useContainerValue(cardDefinition, layoutValues), bucket = useContainerValue(cardDefinition, bucketValues);
    const [commits, setCommits] = useState(0), [chips, setChips] = useState<Readonly<Record<string, Geometry>>>({});
    useLayoutEffect(() => setCommits(n => n + 1), [selected]);
    const record = (name: string, event: LayoutChangeEvent) => { const next = { ...event.nativeEvent.layout }; setChips(old => JSON.stringify(old[name]) === JSON.stringify(next) ? old : { ...old, [name]: next }); };
    const telemetry = useMemo(() => ({ id, bucket, direction: selected.flexDirection, measured, events, commits, chips }), [id, bucket, selected, measured, events, commits, chips]);
    useLayoutEffect(() => report(id, telemetry), [id, report, telemetry]);
    useLayoutEffect(() => () => report(id), [id, report]);
    return <View style={{ gap: 4 }}><Text testID={`container-${id}-status`} style={s.copy}>{`${id}: ${bucket} / ${selected.flexDirection} / ${measured?.width ?? 'unmeasured'}`}</Text><Text testID={`container-${id}-telemetry`} accessibilityLabel={'M112:' + JSON.stringify(telemetry)} style={{ ...s.copy, fontSize: 10 }}>{`Events ${events}; selected commits ${commits}`}</Text>
 <View testID={`container-${id}-composition`} style={selected}>{['one', 'two'].map(name => <View key={name} testID={`container-${id}-${name}`} onLayout={event => record(name, event)} style={s.chip}><Text style={s.chipCopy}>{name}</Text></View>)}</View>
 {nested && <View style={{ gap: 6 }}><CardRegion id="same-inner" width={96} report={report}/><DifferentRegion report={report}/></View>}
 {portal === 'source' && <Portal name="m112-source" hostName="m112-host"><BridgedContent selected={selected} bucket={bucket} report={report}/></Portal>}
 {portal === 'destination' && <Portal name="m112-destination" hostName="m112-host"><CardRegion id="destination" width={96} report={report}/></Portal>}
 </View>;
}
function BridgedContent({ selected, bucket, report }: {
    selected: ViewStyle;
    bucket: string;
    report: Report;
}) { useLayoutEffect(() => { report('source-portal', { id: 'source-portal', bucket, direction: selected.flexDirection }); return () => report('source-portal'); }, [selected, bucket, report]); return <View testID="container-source-portal" style={[selected, { width: 288 }]}><Text style={s.copy}>{`Source bridge: ${bucket} / ${selected.flexDirection}`}</Text></View>; }
function CardRegion({ id, width, report, nested = false, portal = 'closed' }: {
    id: string;
    width: number;
    report: Report;
    nested?: boolean;
    portal?: ContainerScenario['portal'];
}) {
    const layout = useContainerLayout(cardDefinition), [measurement, setMeasurement] = useState<Geometry>(), [events, setEvents] = useState(0);
    const onLayout = useCallback((event: LayoutChangeEvent) => { layout.onLayout(event); setMeasurement({ ...event.nativeEvent.layout }); setEvents(n => n + 1); }, [layout]);
    return <ContainerProvider layout={layout}><View testID={`container-${id}-owner`} collapsable={false} onLayout={onLayout} style={{ width, alignSelf: 'flex-start' }}><CardContent id={id} measured={measurement} events={events} nested={nested} report={report} portal={portal}/></View></ContainerProvider>;
}
function OuterCardReader({ report }: {
    report: Report;
}) { const bucket = useContainerValue(cardDefinition, bucketValues), region = useContainerValue(regionDefinition, bucketValues); useLayoutEffect(() => { report('different-inner', { id: 'different-inner', bucket, region }); return () => report('different-inner'); }, [bucket, region, report]); return <Text testID="container-different-inner" style={s.copy}>{`Different inner: card ${bucket}; region ${region}`}</Text>; }
function DifferentRegion({ report }: {
    report: Report;
}) { const layout = useContainerLayout(regionDefinition); return <ContainerProvider layout={layout}><View onLayout={layout.onLayout} style={{ width: 96 }}><OuterCardReader report={report}/></View></ContainerProvider>; }
const heightValues = Object.freeze({ unmeasured: 'unmeasured', short: 'short', tall: 'tall' });
function HeightContent({ measurement, events, report }: {
    measurement: Geometry | undefined;
    events: number;
    report: Report;
}) { const bucket = useContainerValue(cardHeightDefinition, heightValues); useLayoutEffect(() => report('height', { id: 'height', bucket, measured: measurement, events }), [bucket, measurement, events, report]); useLayoutEffect(() => () => report('height'), [report]); return <Text testID="container-height-status" style={s.copy}>{`Height: ${bucket}`}</Text>; }
function HeightRegion({ height, report }: {
    height: number;
    report: Report;
}) { const layout = useContainerLayout(cardHeightDefinition), [measurement, setMeasurement] = useState<Geometry>(), [events, setEvents] = useState(0); return <ContainerProvider layout={layout}><View testID="container-height-owner" onLayout={event => { layout.onLayout(event); setMeasurement({ ...event.nativeEvent.layout }); setEvents(n => n + 1); }} style={{ height, width: 288, backgroundColor: '#fef3c7', padding: 8 }}><HeightContent measurement={measurement} events={events} report={report}/><Text testID="container-height-telemetry" accessibilityLabel={'M112:' + JSON.stringify({ id: 'height', measured: measurement, events })} style={s.copy}>{`Measured height ${measurement?.height ?? 'unmeasured'}; events ${events}`}</Text></View></ContainerProvider>; }
const controls: readonly (readonly [
    ContainerAction,
    string
])[] = [['same-bucket', 'A 200'], ['wide', 'A 288'], ['boundary', 'A 240'], ['narrow', 'A 176'], ['unmount', 'Unmount A'], ['remount', 'Remount A'], ['toggle-nested', 'Nested'], ['height-tall', 'Height 180'], ['height-short', 'Height 120'], ['open-source-portal', 'Source portal'], ['open-destination-portal', 'Dest portal'], ['close-portal', 'Close portal']];
export function ContainerPanel() { const [state, setState] = useState(initialContainerScenario), [telemetry, setTelemetry] = useState<Record<string, Record<string, unknown>>>({}); const report = useCallback<Report>((id, data) => setTelemetry(old => { if (JSON.stringify(old[id]) === JSON.stringify(data))
    return old; const next = { ...old }; if (data)
    next[id] = data;
else
    delete next[id]; return next; }), []); return <View style={{ flex: 1, gap: 8 }}><Text style={{ ...s.copy, fontSize: 18, fontWeight: '600' }}>Container conditions</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{controls.map(([action, label]) => <Pressable key={action} testID={`container-action-${action}`} accessibilityRole="button" accessibilityLabel={label} onPress={() => setState(old => updateContainerScenario(old, action))} style={s.control}><Text style={s.copy}>{label}</Text></Pressable>)}</View><Text testID="container-all-telemetry" accessibilityLabel={'M112All:' + JSON.stringify({ state, telemetry })} style={{ ...s.copy, fontSize: 10 }}>Native observations: {Object.keys(telemetry).join(', ')}</Text><ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 24 }}><Text testID="container-scenario" accessibilityLabel={'M112State:' + JSON.stringify(state)} style={s.copy}>{`A generation ${state.a.key}; nested ${state.nested}; portal ${state.portal}`}</Text>{state.a.mounted ? <CardRegion key={state.a.key} id="A" width={state.a.width} report={report} nested={state.nested} portal={state.portal}/> : <Text testID="container-A-unmounted">A unmounted</Text>}<CardRegion id="B" width={state.b.width} report={report}/><HeightRegion height={state.height} report={report}/><View style={{ width: 288 }}><PortalHost name="m112-host"/></View></ScrollView></View>; }
