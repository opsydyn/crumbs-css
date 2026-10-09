import { useMemo, useLayoutEffect } from 'react';
import { admitMotionDefinition } from './definition';
import { admitMotionOptions } from './policy';
import { createMotionOwner } from './owner';
import { createAnimatedMotionDriver } from './animated';
import type { NativeMotionDefinition } from './model';
import type { NativeMotionOptions, NativeMotionController, ExactMotionOptions } from './native-model';
export function useNativeMotion<const D extends NativeMotionDefinition, const O extends NativeMotionOptions<NoInfer<D>>>(definition: D, options: O & ExactMotionOptions<O>): NativeMotionController<D> {
    admitMotionDefinition(definition);
    const admitted = admitMotionOptions(definition, options);
    const owner = useMemo(() => createMotionOwner(definition, admitted.initial, createAnimatedMotionDriver()), [definition]);
    useLayoutEffect(() => { owner.activate(admitted); return () => owner.deactivate(); }, [owner]);
    useLayoutEffect(() => owner.commitOptions(admitted), [owner, admitted.initial, admitted.motion, admitted.duration]);
    return owner.controller;
}
