import { expect, test } from 'bun:test';
import { defineMotion } from '../src/theme-motion';
import type { NativeMotionDefinition } from '../src/theme-motion';
import { admitMotionDefinition, motionChannels } from '../src/motion/definition';
import { admitMotionOptions, admitMotionTarget } from '../src/motion/policy';
const input = () => ({ states: { resting: { opacity: .8, translateY: 0 }, selected: { opacity: 1, translateY: -4 } }, transition: { duration: 180, easing: 'ease-out' as const } });
const unsafe = (x: unknown): NativeMotionDefinition => defineMotion(x as never);
const invalid = (x: unknown) => expect(() => unsafe(x)).toThrow('CRUMBS_CSS_INVALID_MOTION_DEFINITION');
test('copies_without_freezing_input', () => { const x = input(), d = defineMotion(x); x.states.resting.opacity = .4; expect(d.states.resting.opacity).toBe(.8); expect(Object.isFrozen(x)).toBe(false); expect(Object.isFrozen(d)).toBe(true); expect(Object.isFrozen(d.states)).toBe(true); expect(Object.isFrozen(d.states.resting)).toBe(true); expect(Object.isFrozen(d.transition)).toBe(true); expect(Object.getPrototypeOf(d.states)).toBeNull(); expect(Object.getPrototypeOf(d.states.resting)).toBeNull(); expect(Object.keys(d).sort()).toEqual(['$$type', 'formatVersion', 'states', 'transition']); });
test('all_states_have_one_exact_channel_set', () => { invalid({ ...input(), states: {} }); for (const n of [1, 16])
    expect(Object.keys(unsafe({ ...input(), states: Object.fromEntries(Array.from({ length: n }, (_, i) => ['s' + i, { opacity: .5 }])) }).states)).toHaveLength(n); invalid({ ...input(), states: Object.fromEntries(Array.from({ length: 17 }, (_, i) => ['s' + i, { opacity: .5 }])) }); invalid({ ...input(), states: { a: {}, b: {} } }); invalid({ ...input(), states: { a: { opacity: 0 }, b: { opacity: 1, translateY: 4 } } }); invalid({ ...input(), states: { a: { width: 10 } } }); for (const name of ['constructor', 'prototype', '__proto__', '0bad', 'bad name', 'A'.repeat(65)])
    invalid({ ...input(), states: Object.fromEntries([[name, { opacity: .5 }]]) }); expect(unsafe({ ...input(), states: { ['A'.repeat(64)]: { opacity: .5 } } }).states).toBeDefined(); });
test('rejects_accessors_without_execution', () => { let calls = 0; const getter = () => { calls++; return .5; }; for (const at of ['root', 'states', 'target', 'transition']) {
    const x: any = input();
    const obj = at === 'root' ? x : at === 'states' ? x.states : at === 'target' ? x.states.resting : x.transition;
    Object.defineProperty(obj, at === 'root' ? 'states' : at === 'states' ? 'resting' : at === 'target' ? 'opacity' : 'duration', { get: getter, enumerable: true });
    invalid(x);
} expect(calls).toBe(0); for (const decorate of [(x: any) => Object.defineProperty(x, 'hidden', { value: 1 }), (x: any) => x[Symbol('x')] = 1, (x: any) => x.extra = 1, (x: any) => Object.setPrototypeOf(x, { inherited: 1 })]) {
    const x = input();
    decorate(x);
    invalid(x);
} invalid([]); invalid({ ...input(), states: [] }); invalid({ ...input(), transition: { ...input().transition, extra: 1 } }); invalid({ ...input(), states: { a: { opacity: .5, extra: 2 } } }); });
test('canonical_transform_order', () => { const d = defineMotion({ states: { a: { scaleY: 1, scaleX: -1, scale: 0, translateY: 2, translateX: 3, opacity: .5 } }, transition: { duration: 0, easing: 'linear' } }); expect(motionChannels(d)).toEqual(['opacity', 'translateX', 'translateY', 'scale', 'scaleX', 'scaleY']); expect(Object.keys(d.states.a)).toEqual(['opacity', 'translateX', 'translateY', 'scale', 'scaleX', 'scaleY']); });
test('native_numeric_and_duration_bounds', () => { for (const value of [-.01, 1.01, NaN, Infinity, '1', () => 1])
    invalid({ ...input(), states: { a: { opacity: value } } }); for (const value of [Infinity, NaN, 3.5e38, '3'])
    invalid({ ...input(), states: { a: { translateX: value } } }); for (const value of [0, -4, 3.4028234663852886e38, .1234567890123])
    expect(unsafe({ ...input(), states: { a: { translateX: value } } }).states.a!.translateX).toBe(value); for (const value of [0, .5, 60000])
    expect(unsafe({ ...input(), transition: { duration: value, easing: 'linear' } }).transition.duration).toBe(value); for (const value of [-1, 60000.1, NaN, Infinity])
    invalid({ ...input(), transition: { duration: value, easing: 'linear' } }); for (const easing of ['linear', 'ease-in', 'ease-out', 'ease-in-out'] as const)
    expect(unsafe({ ...input(), transition: { duration: 0, easing } }).transition.easing).toBe(easing); invalid({ ...input(), transition: { duration: 0, easing: 'bounce' } }); const d = defineMotion({ states: { a: { opacity: -0, scale: -0 } }, transition: { duration: -0, easing: 'linear' } }); expect(Object.is(d.states.a.opacity, -0)).toBe(false); expect(Object.is(d.states.a.scale, -0)).toBe(false); expect(Object.is(d.transition.duration, -0)).toBe(false); });
const freeze = (x: any): any => { if (x && typeof x === 'object') {
    for (const v of Object.values(x))
        freeze(v);
    Object.freeze(x);
} return x; };
test('admits_frozen_foreign_v1_only', () => { const d = defineMotion(input()), foreign = freeze(JSON.parse(JSON.stringify(d))); expect(admitMotionDefinition(foreign).states.selected!.translateY).toBe(-4); expect(() => admitMotionDefinition(JSON.parse(JSON.stringify(d)))).toThrow('CRUMBS_CSS_INVALID_MOTION_DEFINITION'); expect(() => admitMotionDefinition(freeze({ ...foreign, formatVersion: 2 }))).toThrow('CRUMBS_CSS_MOTION_UNSUPPORTED_VERSION'); expect(() => admitMotionDefinition(freeze({ ...foreign, $$type: 'else' }))).toThrow('CRUMBS_CSS_INVALID_MOTION_DEFINITION'); });
test('options_and_targets_are_closed_without_getter_execution', () => { const d = defineMotion(input()); expect(admitMotionOptions(d, { initial: 'resting', motion: 'full' })).toEqual({ initial: 'resting', motion: 'full', duration: 180 }); expect(admitMotionOptions(d, { initial: 'selected', motion: 'reduced', duration: 0 }).duration).toBe(0); expect(admitMotionTarget(d, 'selected')).toBe('selected'); expect(() => admitMotionTarget(d, 'unknown')).toThrow('CRUMBS_CSS_INVALID_MOTION_TARGET'); for (const x of [{ initial: 'bad', motion: 'full' }, { initial: 'resting', motion: 'auto' }, { initial: 'resting', motion: 'full', duration: Infinity }, { initial: 'resting', motion: 'full', extra: 1 }])
    expect(() => admitMotionOptions(d, x)).toThrow('CRUMBS_CSS_INVALID_MOTION_OPTIONS'); let calls = 0; const x = { initial: 'resting', get motion() { calls++; return 'full'; } }; expect(() => admitMotionOptions(d, x)).toThrow('CRUMBS_CSS_INVALID_MOTION_OPTIONS'); expect(calls).toBe(0); });
