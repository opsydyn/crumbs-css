import type * as Runtime from './runtime.cjs';
import type * as PureRuntime from './pure-runtime.cjs';
export declare const styledView:(...args:Parameters<typeof Runtime.createStyledView>)=>ReturnType<typeof Runtime.createStyledView>;
export declare const themedView:(...args:Parameters<typeof Runtime.createThemedView>)=>ReturnType<typeof Runtime.createThemedView>;
export declare const pureFunction:(...args:Parameters<typeof PureRuntime.make>)=>ReturnType<typeof PureRuntime.make>;
