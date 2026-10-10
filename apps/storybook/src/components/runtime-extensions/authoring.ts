import type * as Runtime from '@crumbs/storybook/runtime-extensions';
import { defineExtension } from '@opsydyn/crumbs-css/extensions';
export const styledView = defineExtension<typeof Runtime>().factory({ importPath: '@crumbs/storybook/runtime-extensions', importName: 'createStyledView' });
export const themedView = defineExtension<typeof Runtime>().factory({ importPath: '@crumbs/storybook/runtime-extensions', importName: 'createThemedView' });
