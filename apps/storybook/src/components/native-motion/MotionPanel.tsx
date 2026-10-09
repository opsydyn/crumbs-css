import { useCallback, useLayoutEffect, useReducer, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import type { NativeMotionPreference } from '@opsydyn/crumbs-css/theme/conditions';
import { useNativeMotion } from '@opsydyn/crumbs-css/theme/motion/native';
import type { NativeMotionController, NativeMotionRun } from '@opsydyn/crumbs-css/theme/motion/native';
import { motionDefinition } from './motion-definitions';
import { initialMotionScenario, updateMotionScenario } from './motion-model';
import type { MotionAction, MotionCardId, MotionNamedTarget } from './motion-model';
import * as s from './motion-panel.css';
type Controller = NativeMotionController<typeof motionDefinition>;
type Run = NativeMotionRun<typeof motionDefinition>;
function Control({ id, label, press, disabled = false }: {
    id: string;
    label: string;
    press: () => void;
    disabled?: boolean;
}) { return <Pressable testID={id} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={press} style={[s.control, { opacity: disabled ? .4 : 1 }]}><Text style={s.copy}>{label}</Text></Pressable>; }
function Card({ id, generation, motion, duration, dispatch, register, commits }: {
    id: MotionCardId;
    generation: number;
    motion: NativeMotionPreference;
    duration: number;
    dispatch: (action: MotionAction) => void;
    register?: (controller: Controller | undefined) => void;
    commits: Record<string, number>;
}) {
    const c = useNativeMotion(motionDefinition, { initial: 'resting', motion, duration }), mounted = useRef(false), pending = useRef(false), runs = useRef<{
        current?: Run;
        previous?: Run;
    }>({});
    useLayoutEffect(() => { mounted.current = true; register?.(c); return () => { mounted.current = false; register?.(undefined); }; }, [c, generation, register]);
    useLayoutEffect(() => { commits[id] = (commits[id] ?? 0) + 1; });
    const animate = (target: MotionNamedTarget) => { dispatch({ type: 'request', card: id, target }); const run = c.animateTo(target); if (runs.current.current === run)
        return; pending.current=true; runs.current = { current: run, ...(runs.current.current ? { previous: runs.current.current } : {}) }; void run.result.then(result => { if(runs.current.current===run)pending.current=false; if (mounted.current)
        dispatch({ type: 'terminal', card: id, generation, result }); }); };
    return <View style={{ gap: 5 }}><Text style={s.copy}>{`Card ${id.toUpperCase()} · mount ${generation}`}</Text><View testID={`motion-track-${id}`} style={s.track}><Animated.View testID={`motion-card-${id}`} style={[s.marker, { backgroundColor: id === 'a' ? '#2563eb' : '#16a34a' }, c.style]}/></View><View style={s.row}>
 <Control id={`motion-${id}-select`} label={`${id.toUpperCase()} Select`} press={() => animate('selected')}/><Control id={`motion-${id}-rest`} label={`${id.toUpperCase()} Rest`} press={() => animate('resting')}/>
 {id === 'a' && <><Control id="motion-a-cancel" label="A Cancel" press={() => c.cancel()}/><Control id="motion-a-set" label="A Set" press={() => { dispatch({ type: 'request', card: id, target: 'selected' }); c.set('selected'); }}/><Control id="motion-a-stale-cancel" label="A Stale cancel" press={() => {dispatch({type:'stale-cancel',pending:pending.current});runs.current.previous?.cancel()}}/></>}
 </View></View>;
}
export function MotionPanel({ motion }: {
    motion: NativeMotionPreference;
}) {
    const [state, dispatch] = useReducer(updateMotionScenario, undefined, initialMotionScenario), controller = useRef<Controller | undefined>(undefined), commits = useRef<Record<string, number>>({ panel: 0, a: 0, b: 0 });
    useLayoutEffect(() => { commits.current.panel = (commits.current.panel ?? 0) + 1; });
    const register = useCallback((c: Controller | undefined) => { controller.current = c; }, []), effective = state.policy === 'native' ? motion : state.policy, duration = state.duration === 'zero' ? 0 : 5000;
    const observation = { sourceMode: state.policy === 'native' ? 'native' : 'explicit-' + state.policy, nativeMotion: motion, effectiveMotion: effective, state, commits: commits.current };
    const telemetry = 'M113:' + JSON.stringify(observation);
    return <View style={s.panel}><Text style={s.heading} testID="motion-title">Native motion M11.3</Text><Text style={s.copy}>{`Native preference: ${motion}; source: ${observation.sourceMode}; duration: ${duration}ms`}</Text>
 {state.aMounted && <Card key={state.aGeneration} id="a" generation={state.aGeneration} motion={effective} duration={duration} dispatch={dispatch} register={register} commits={commits.current}/>}
 <Card id="b" generation={0} motion={effective} duration={duration} dispatch={dispatch} commits={commits.current}/>
 <View style={s.row}><Control id="motion-a-unmount" label="Unmount A" disabled={!state.aMounted} press={() => dispatch({ type: 'unmount' })}/><Control id="motion-a-remount" label="Remount A" disabled={state.aMounted} press={() => dispatch({ type: 'remount' })}/><Control id="motion-a-unmount-preparing" label="Prepare/unmount A" disabled={!state.aMounted} press={() => { controller.current?.set('resting'); controller.current?.animateTo('selected'); dispatch({ type: 'unmount' }); }}/></View>
 <View style={s.row}><Control id="motion-duration-zero" label="Zero duration" press={() => dispatch({ type: 'duration', value: 'zero' })}/><Control id="motion-duration-normal" label="Normal duration" press={() => dispatch({ type: 'duration', value: 'normal' })}/></View>
 <View style={s.row}>{(['native', 'full', 'reduced'] as const).map(value => <Control key={value} id={`motion-policy-${value}`} label={value === 'native' ? 'Native policy' : `${value} override`} press={() => dispatch({ type: 'policy', value })}/>)}</View>
 <Text testID="motion-observations" accessibilityLabel={telemetry} style={{ ...s.copy, fontSize: 10 }}>{telemetry}</Text>
 </View>;
}
