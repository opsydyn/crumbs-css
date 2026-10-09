import { defineMotion } from '../src/theme-motion';
import type { NativeMotionDefinitionInput, NativeMotionState } from '../src/theme-motion';
const d = defineMotion({ states: { resting: { opacity: .8, translateY: 0 }, selected: { opacity: 1, translateY: -4 } }, transition: { duration: 180, easing: 'ease-out' } });
const state: NativeMotionState<typeof d> = 'selected';
void state;
// @ts-expect-error unknown state cannot widen the captured definition
const bad: NativeMotionState<typeof d> = 'unknown';
void bad;
// @ts-expect-error returned targets are immutable
d.states.resting.opacity = .5;
// @ts-expect-error unsupported channel
defineMotion({ states: { a: { opacity: 1, width: 2 } }, transition: { duration: 0, easing: 'linear' } });
const extra = { states: { a: { opacity: 1, rotate: 2 } }, transition: { duration: 0, easing: 'linear' as const } };
// @ts-expect-error predeclared unsupported channel
defineMotion(extra);
const mismatch = { states: { a: { opacity: 1 }, b: { opacity: 0, translateX: 4 } }, transition: { duration: 0, easing: 'linear' as const } };
// @ts-expect-error sibling channel missing on predeclared map
defineMotion(mismatch);
// @ts-expect-error empty target
defineMotion({ states: { a: {} }, transition: { duration: 0, easing: 'linear' } });
// @ts-expect-error empty states
defineMotion({ states: {}, transition: { duration: 0, easing: 'linear' } });
const extraRoot = { states: { a: { opacity: 1 } }, transition: { duration: 0, easing: 'linear' as const }, extra: 1 };
// @ts-expect-error predeclared root extra
defineMotion(extraRoot);
const extraTransition = { states: { a: { opacity: 1 } }, transition: { duration: 0, easing: 'linear' as const, delay: 1 } };
// @ts-expect-error predeclared transition extra
defineMotion(extraTransition);
const typed: NativeMotionDefinitionInput<{
    a: {
        opacity: number;
    };
}> = { states: { a: { opacity: 1 } }, transition: { duration: 0, easing: 'linear' } };
defineMotion(typed);
defineMotion({ states: { a: { opacity: 1, translateX: 0, translateY: 0, scale: -1, scaleX: 0, scaleY: 1 } }, transition: { duration: 0, easing: 'ease-in' } });
