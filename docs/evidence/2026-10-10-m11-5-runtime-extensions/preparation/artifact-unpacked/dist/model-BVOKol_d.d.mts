//#region src/motion/model.d.ts
type NativeMotionChannel = 'opacity' | 'translateX' | 'translateY' | 'scale' | 'scaleX' | 'scaleY';
type NativeMotionEasing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
type NativeMotionTarget = Readonly<Partial<Record<NativeMotionChannel, number>>>;
type MotionStateTable = Readonly<Record<string, NativeMotionTarget>>;
type NativeMotionDefinitionInput<S extends MotionStateTable = MotionStateTable> = {
  readonly states: S;
  readonly transition: {
    readonly duration: number;
    readonly easing: NativeMotionEasing;
  };
};
declare const motionBrand: unique symbol;
type NativeMotionDefinition<S extends MotionStateTable = MotionStateTable> = {
  readonly $$type: 'crumbs.css.motion-definition';
  readonly formatVersion: 1;
  readonly states: { readonly [K in keyof S]: Readonly<S[K]> };
  readonly transition: {
    readonly duration: number;
    readonly easing: NativeMotionEasing;
  };
  readonly [motionBrand]: S;
};
type NativeMotionState<D extends NativeMotionDefinition> = Extract<keyof D['states'], string>;
type Channels<S extends MotionStateTable> = { [K in keyof S]: keyof S[K] }[keyof S];
type ExactMotionInput<I extends NativeMotionDefinitionInput> = Record<Exclude<keyof I, 'states' | 'transition'>, never> & {
  transition: Record<Exclude<keyof I['transition'], 'duration' | 'easing'>, never>;
  states: { [K in keyof I['states']]: Record<Exclude<keyof I['states'][K], NativeMotionChannel>, never> & Record<Extract<Channels<I['states']>, NativeMotionChannel>, number> };
} & (keyof I['states'] extends never ? never : unknown) & (Channels<I['states']> extends never ? never : unknown);
//#endregion
export { NativeMotionEasing as a, NativeMotionDefinitionInput as i, NativeMotionChannel as n, NativeMotionState as o, NativeMotionDefinition as r, NativeMotionTarget as s, ExactMotionInput as t };