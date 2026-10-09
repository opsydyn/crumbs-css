import type { Animated, ViewStyle } from 'react-native';
import type { NativeMotionDefinition, NativeMotionState } from './model';
import type { NativeMotionPreference } from '../conditions/index';
export type NativeMotionOptions<D extends NativeMotionDefinition = NativeMotionDefinition> = Readonly<{
    initial: NativeMotionState<D>;
    motion: NativeMotionPreference;
    duration?: number;
}>;
export type ExactMotionOptions<O> = Record<Exclude<keyof O, 'initial' | 'motion' | 'duration'>, never>;
export type NativeMotionResult<D extends NativeMotionDefinition = NativeMotionDefinition> = Readonly<{
    status: 'finished';
    target: NativeMotionState<D>;
    mode: 'animated' | 'immediate';
} | {
    status: 'cancelled';
    target: NativeMotionState<D>;
    reason: 'cancelled' | 'superseded' | 'set' | 'deactivated' | 'driver-stopped';
} | {
    status: 'failed';
    target: NativeMotionState<D>;
    code: 'CRUMBS_CSS_MOTION_DRIVER_FAILED';
}>;
export type NativeMotionRun<D extends NativeMotionDefinition = NativeMotionDefinition> = Readonly<{
    result: Promise<NativeMotionResult<D>>;
    cancel(): void;
}>;
export type NativeMotionController<D extends NativeMotionDefinition = NativeMotionDefinition> = Readonly<{
    style: Animated.WithAnimatedObject<ViewStyle>;
    animateTo(state: NativeMotionState<D>): NativeMotionRun<D>;
    set(state: NativeMotionState<D>): void;
    cancel(): void;
}>;
