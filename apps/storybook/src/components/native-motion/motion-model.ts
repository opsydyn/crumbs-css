import type { NativeMotionResult } from '@opsydyn/crumbs-css/theme/motion/native';
import type { motionDefinition } from './motion-definitions';
export type MotionCardId = 'a' | 'b';
export type MotionNamedTarget = 'resting' | 'selected';
export type MotionTerminal = Readonly<{
    card: MotionCardId;
    generation: number;
    result: NativeMotionResult<typeof motionDefinition>;
}>;
export type MotionScenario = Readonly<{
    aMounted: boolean;
    aGeneration: number;
    staleCancelDuringPending: boolean | null;
    requested: Readonly<Record<MotionCardId, MotionNamedTarget>>;
    duration: 'normal' | 'zero';
    policy: 'native' | 'full' | 'reduced';
    terminals: readonly MotionTerminal[];
}>;
export type MotionAction = {type:'stale-cancel';pending:boolean} |  {
    type: 'request';
    card: MotionCardId;
    target: MotionNamedTarget;
} | ({
    type: 'terminal';
} & MotionTerminal) | {
    type: 'unmount' | 'remount';
} | {
    type: 'duration';
    value: MotionScenario['duration'];
} | {
    type: 'policy';
    value: MotionScenario['policy'];
};
export function initialMotionScenario(): MotionScenario { return { aMounted: true, aGeneration: 0, staleCancelDuringPending:null, requested: { a: 'resting', b: 'resting' }, duration: 'normal', policy: 'native', terminals: [] }; }
export function updateMotionScenario(state: MotionScenario, action: MotionAction): MotionScenario { switch (action.type) {
    case 'stale-cancel': return {...state,staleCancelDuringPending:action.pending};
    case 'request': return state.requested[action.card] === action.target ? state : { ...state, requested: { ...state.requested, [action.card]: action.target } };
    case 'terminal':
        if (action.card === 'a' && (!state.aMounted || state.aGeneration !== action.generation) || action.card === 'b' && action.generation !== 0)
            return state;
        return { ...state, terminals: [...state.terminals, { card: action.card, generation: action.generation, result: action.result }].slice(-2) };
    case 'unmount': return state.aMounted ? { ...state, aMounted: false } : state;
    case 'remount': return state.aMounted ? state : { ...state, aMounted: true, aGeneration: state.aGeneration + 1, requested: { ...state.requested, a: 'resting' } };
    case 'duration': return { ...state, duration: action.value };
    case 'policy': return { ...state, policy: action.value };
} }
