import { defineContainer } from '@opsydyn/crumbs-css/theme/containers';
export const cardDefinition = defineContainer({ owner: '@fixture/ui', name: 'card', version: 1, axis: 'width', buckets: { narrow: 0, wide: 240 } });
export const regionDefinition = defineContainer({ owner: '@fixture/ui', name: 'region', version: 1, axis: 'width', buckets: { narrow: 0, wide: 120 } });
export const cardHeightDefinition = defineContainer({ owner: '@fixture/ui', name: 'cardHeight', version: 1, axis: 'height', buckets: { short: 0, tall: 160 } });
