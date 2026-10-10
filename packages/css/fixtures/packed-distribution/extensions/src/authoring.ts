import type * as Runtime from '@acme/crumbs-extensions/runtime';
import type * as PureRuntime from '@acme/crumbs-extensions/pure-runtime';
import { defineExtension } from '@opsydyn/crumbs-css/extensions';
const native = defineExtension<typeof Runtime>();
export const styledView = native.factory({ importPath: '@acme/crumbs-extensions/runtime', importName: 'createStyledView' });
export const themedView = native.factory({ importPath: '@acme/crumbs-extensions/runtime', importName: 'createThemedView' });
export const pureFunction = defineExtension<typeof PureRuntime>().factory({ importPath: '@acme/crumbs-extensions/pure-runtime', importName: 'make' });
