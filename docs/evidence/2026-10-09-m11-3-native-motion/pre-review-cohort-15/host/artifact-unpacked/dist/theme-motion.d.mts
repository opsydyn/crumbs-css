import { a as NativeMotionEasing, i as NativeMotionDefinitionInput, n as NativeMotionChannel, o as NativeMotionState, r as NativeMotionDefinition, s as NativeMotionTarget, t as ExactMotionInput } from "./model-C2Gl5eis.mjs";

//#region src/motion/definition.d.ts
declare function defineMotion<const I extends NativeMotionDefinitionInput>(input: I & ExactMotionInput<I>): NativeMotionDefinition<I['states']>;
//#endregion
export { type NativeMotionChannel, type NativeMotionDefinition, type NativeMotionDefinitionInput, type NativeMotionEasing, type NativeMotionState, type NativeMotionTarget, defineMotion };