export type NativeMotionChannel = 'opacity' | 'translateX' | 'translateY' | 'scale' | 'scaleX' | 'scaleY';
export type NativeMotionEasing = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
export type NativeMotionTarget = Readonly<Partial<Record<NativeMotionChannel, number>>>;
export type MotionStateTable = Readonly<Record<string, NativeMotionTarget>>;
export type NativeMotionDefinitionInput<S extends MotionStateTable = MotionStateTable> = {
    readonly states: S;
    readonly transition: {
        readonly duration: number;
        readonly easing: NativeMotionEasing;
    };
};
declare const motionBrand: unique symbol;
export type NativeMotionDefinition<S extends MotionStateTable = MotionStateTable> = {
    readonly $$type: 'crumbs.css.motion-definition';
    readonly formatVersion: 1;
    readonly states: {
        readonly [K in keyof S]: Readonly<S[K]>;
    };
    readonly transition: {
        readonly duration: number;
        readonly easing: NativeMotionEasing;
    };
    readonly [motionBrand]: S;
};
export type NativeMotionState<D extends NativeMotionDefinition> = Extract<keyof D['states'], string>;
type Channels<S extends MotionStateTable> = {
    [K in keyof S]: keyof S[K];
}[keyof S];
export type ExactMotionInput<I extends NativeMotionDefinitionInput> = Record<Exclude<keyof I, 'states' | 'transition'>, never> & {
    transition: Record<Exclude<keyof I['transition'], 'duration' | 'easing'>, never>;
    states: {
        [K in keyof I['states']]: Record<Exclude<keyof I['states'][K], NativeMotionChannel>, never> & Record<Extract<Channels<I['states']>, NativeMotionChannel>, number>;
    };
} & (keyof I['states'] extends never ? never : unknown) & (Channels<I['states']> extends never ? never : unknown);
export type MotionPolicy = Readonly<{
    duration: number;
    easing: NativeMotionEasing;
    motion: 'full' | 'reduced';
}>;
export type AdmittedMotionOptions<D extends NativeMotionDefinition = NativeMotionDefinition> = Readonly<{
    initial: NativeMotionState<D>;
    motion: 'full' | 'reduced';
    duration: number;
}>;
