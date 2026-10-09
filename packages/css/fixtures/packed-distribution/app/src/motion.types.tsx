import { Animated } from 'react-native';
import { defineMotion } from '@opsydyn/crumbs-css/theme/motion';
import { useNativeMotion } from '@opsydyn/crumbs-css/theme/motion/native';
const d = defineMotion({ states: { resting: { opacity: .6, translateX: 0 }, selected: { opacity: 1, translateX: 112 } }, transition: { duration: 180, easing: 'linear' } });
export function MotionTypes() {
    const c = useNativeMotion(d, { initial: 'resting', motion: 'full' });
    c.animateTo('selected');
    c.set('resting');
    // @ts-expect-error unknown target cannot widen the definition
    c.animateTo('unknown');
    // @ts-expect-error unknown initial cannot widen the definition
    useNativeMotion(d, { initial: 'unknown', motion: 'full' });
    const extras = { initial: 'resting' as const, motion: 'full' as const, extra: 1 };
    // @ts-expect-error predeclared options extras
    useNativeMotion(d, extras);
    return <Animated.View style={c.style}/>;
}
const bad = { states: { a: { opacity: 1, rotate: 2 } }, transition: { duration: 0, easing: 'linear' as const } };
// @ts-expect-error installed predeclared channel rejection
defineMotion(bad);
