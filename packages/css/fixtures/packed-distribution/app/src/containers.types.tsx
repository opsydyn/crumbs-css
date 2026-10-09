import { defineContainer, getContainerBucket, resolveContainerValue, useContainerLayout, ContainerProvider, useContainerValue } from '@opsydyn/crumbs-css/theme/containers';
import type { NativeContainerAxis, NativeContainerDefinitionInput, NativeContainerDefinition, NativeContainerBucket, NativeContainerValues, NativeContainerLayout, ContainerProviderProps } from '@opsydyn/crumbs-css/theme/containers';
import type { ViewStyle } from 'react-native';
const input = { owner: '@fixture/types', name: 'card', version: 1, axis: 'width', buckets: { narrow: 0, wide: 240 } } as const;
const d = defineContainer(input);
const bucket: NativeContainerBucket<typeof d> = getContainerBucket(d);
const values = { unmeasured: null, narrow: 'stacked', wide: 42 } as const;
const value: null | 'stacked' | 42 = resolveContainerValue(d, bucket, values);
// @ts-expect-error missing fallback
resolveContainerValue(d, 'narrow', { narrow: 1, wide: 2 });
// @ts-expect-error missing branch
resolveContainerValue(d, 'narrow', { unmeasured: 0, narrow: 1 });
// @ts-expect-error fresh extra
resolveContainerValue(d, 'narrow', { unmeasured: 0, narrow: 1, wide: 2, extra: 3 });
const extra = { unmeasured: 0, narrow: 1, wide: 2, extra: 3 };
// @ts-expect-error predeclared extra
resolveContainerValue(d, 'narrow', extra);
// @ts-expect-error unknown bucket
resolveContainerValue(d, 'other', values);
function Types() {
    const layout: NativeContainerLayout<typeof d> = useContainerLayout(d);
    const selected: null | 'stacked' | 42 = useContainerValue(d, values);
    const view: ViewStyle = useContainerValue(d, { unmeasured: {}, narrow: { flexDirection: 'column' }, wide: { flexDirection: 'row' } });
    // @ts-expect-error hooks reject incomplete maps
    useContainerValue(d, { narrow: 0, wide: 1 });
    // @ts-expect-error hooks reject predeclared extra keys
    useContainerValue(d, extra);
    return <ContainerProvider layout={layout}>{String(selected)}</ContainerProvider>;
}
void [value, Types];
