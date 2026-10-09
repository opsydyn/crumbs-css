import { defineContainer, getContainerBucket } from "../src/containers/definition";
import { resolveContainerValue } from "../src/containers/values";
import type { ViewStyle, TextStyle, ImageStyle } from "react-native";
const d = defineContainer({ owner: '@fixture/types', name: 'card', version: 1, axis: 'width', buckets: { narrow: 0, wide: 240 } });
const bucket: 'narrow' | 'wide' | 'unmeasured' = getContainerBucket(d, 0);
const literal: 'small' | 42 | null = resolveContainerValue(d, bucket, { unmeasured: null, narrow: 'small', wide: 42 });
// @ts-expect-error missing unmeasured
resolveContainerValue(d, 'narrow', { narrow: 1, wide: 2 });
// @ts-expect-error missing known bucket
resolveContainerValue(d, 'wide', { unmeasured: 0, narrow: 1 });
// @ts-expect-error extra key
resolveContainerValue(d, 'wide', { unmeasured: 0, narrow: 1, wide: 2, other: 3 });
const extra = { unmeasured: 0, narrow: 1, wide: 2, other: 3 };
// @ts-expect-error predeclared extra key
resolveContainerValue(d, 'wide', extra);
// @ts-expect-error unknown bucket
resolveContainerValue(d, 'other', { unmeasured: 0, narrow: 1, wide: 2 });
// @ts-expect-error invalid axis
defineContainer({ owner: 'x', name: 'x', version: 1, axis: 'both', buckets: { a: 0 } });
const view: ViewStyle = resolveContainerValue(d, 'wide', { unmeasured: {}, narrow: { flexDirection: 'column' }, wide: { flexDirection: 'row' } });
const text: TextStyle = resolveContainerValue(d, 'narrow', { unmeasured: {}, narrow: { fontWeight: 'bold' }, wide: { color: 'red' } });
const image: ImageStyle = resolveContainerValue(d, 'wide', { unmeasured: {}, narrow: { resizeMode: 'contain' }, wide: { tintColor: 'red' } });
void [literal, view, text, image];
