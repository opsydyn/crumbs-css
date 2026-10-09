import { g as NativeMotionPreference } from "./index-D5bu2_y1.mjs";
import { a as NativeMotionEasing, i as NativeMotionDefinitionInput, n as NativeMotionChannel, o as NativeMotionState, r as NativeMotionDefinition, s as NativeMotionTarget } from "./model-C2Gl5eis.mjs";
import { Animated, ViewStyle } from "react-native";

//#region src/motion/native-model.d.ts
type NativeMotionOptions<D extends NativeMotionDefinition = NativeMotionDefinition> = Readonly<{
  initial: NativeMotionState<D>;
  motion: NativeMotionPreference;
  duration?: number;
}>;
type ExactMotionOptions<O> = Record<Exclude<keyof O, 'initial' | 'motion' | 'duration'>, never>;
type NativeMotionResult<D extends NativeMotionDefinition = NativeMotionDefinition> = Readonly<{
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
type NativeMotionRun<D extends NativeMotionDefinition = NativeMotionDefinition> = Readonly<{
  result: Promise<NativeMotionResult<D>>;
  cancel(): void;
}>;
type NativeMotionController<D extends NativeMotionDefinition = NativeMotionDefinition> = Readonly<{
  style: Animated.WithAnimatedObject<ViewStyle>;
  animateTo(state: NativeMotionState<D>): NativeMotionRun<D>;
  set(state: NativeMotionState<D>): void;
  cancel(): void;
}>;
//#endregion
//#region src/motion/react.d.ts
declare function useNativeMotion<const D extends NativeMotionDefinition, const O extends NativeMotionOptions<NoInfer<D>>>(definition: D, options: O & ExactMotionOptions<O>): NativeMotionController<D>;
//#endregion
export { type NativeMotionChannel, type NativeMotionController, type NativeMotionDefinition, type NativeMotionDefinitionInput, type NativeMotionEasing, type NativeMotionOptions, type NativeMotionResult, type NativeMotionRun, type NativeMotionState, type NativeMotionTarget, useNativeMotion };