import { Animated, Easing, Platform } from 'react-native';
import { NativeStylesDiagnosticCode as Code } from '../diagnostics';
import { motionError } from './definition';
import type { MotionDriver, MotionValue } from './owner';
import type { NativeMotionChannel } from './model';
const curves = { linear: Easing.linear, 'ease-in': Easing.in(Easing.quad), 'ease-out': Easing.out(Easing.quad), 'ease-in-out': Easing.inOut(Easing.quad) };
const transforms = ['translateX', 'translateY', 'scale', 'scaleX', 'scaleY'] as const;
export function createAnimatedMotionDriver(): MotionDriver {
    const platform = Platform.OS;
    if (platform !== 'ios' && platform !== 'android' && platform !== 'web')
        return motionError(Code.MotionUnsupportedPlatform, 'motion.platform', 'expected ios, android or web');
    const useNativeDriver = platform !== 'web';
    type NodeState = { active: boolean; stop?: { reply: (() => void) | undefined } };
    const states = new WeakMap<MotionValue, NodeState>();
    return {
        createValue(initial) { const value = new Animated.Value(initial); states.set(value, { active: false }); return value; },
        createStyle(values) {
            const style: Record<string, unknown> = {};
            if (values.opacity) style.opacity = values.opacity;
            const transform = transforms.filter(k => values[k]).map(k => Object.freeze({ [k]: values[k] }));
            if (transform.length) style.transform = Object.freeze(transform);
            return Object.freeze(style) as Animated.WithAnimatedObject<import('react-native').ViewStyle>;
        },
        stop(value, onValue, onStopped) {
            const current = states.get(value)!;
            const node = value as Animated.Value;
            if (onValue) {
                current.active = false;
                node.stopAnimation(onValue);
                return;
            }
            if (current.stop) {
                // One hardware stop acknowledgement, owned by the latest operation.
                current.stop.reply = onStopped;
                return true;
            }
            const pending = useNativeDriver && current.active;
            current.active = false;
            if (!pending) {
                node.stopAnimation();
                return;
            }
            const stop = { reply: onStopped };
            current.stop = stop;
            try {
                node.stopAnimation(() => {
                    if (states.get(value) !== current || current.stop !== stop) return;
                    delete current.stop;
                    // No driver writes here: the owner acknowledges/corrects atomically.
                    stop.reply?.();
                });
            } catch (error) {
                delete current.stop;
                throw error;
            }
            return true;
        },
        set(value, next) { (value as Animated.Value).setValue(next); },
        timing(value, next, policy) {
            const animation = Animated.timing(value as Animated.Value, { toValue: next, duration: policy.duration, easing: curves[policy.easing], useNativeDriver, isInteraction: false });
            return {
                start(callback) {
                    const current: NodeState = { active: true };
                    states.set(value, current);
                    animation.start(result => {
                        if (states.get(value) === current) current.active = false;
                        callback(result.finished);
                    });
                },
                stop() { animation.stop(); },
            };
        },
    };
}
