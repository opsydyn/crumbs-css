import { defineExtension } from '../src/extensions';
import type { ViewProps, ViewStyle } from 'react-native';
import type { ReactElement } from 'react';
type Runtime = {
    view: (base: ViewStyle) => (props: ViewProps) => ReactElement;
    make: (label: string, count?: number) => (suffix: string) => string;
    value: number;
    maybe: () => (() => void) | number;
    async: () => Promise<() => void>;
    default: () => () => void;
};
const b = defineExtension<Runtime>();
const create = b.factory({ importPath: 'pkg/runtime', importName: 'make' });
const result: string = create('x')('!');
const View = b.factory({ importPath: 'pkg/runtime', importName: 'view' })({ padding: 16 });
View({ accessibilityLabel: 'x' });
// @ts-expect-error wrong arguments
create(3);
// @ts-expect-error returned function retains parameters
create('x')(3);
// @ts-expect-error View props stay typed
View({ missing: true });
// @ts-expect-error absent export
b.factory({ importPath: 'pkg', importName: 'missing' });
// @ts-expect-error non factory
b.factory({ importPath: 'pkg', importName: 'value' });
// @ts-expect-error every return branch must be callable
b.factory({ importPath: 'pkg', importName: 'maybe' });
// @ts-expect-error asynchronous factory
b.factory({ importPath: 'pkg', importName: 'async' });
// @ts-expect-error default imports outside protocol
b.factory({ importPath: 'pkg', importName: 'default' });
declare const name: 'make' | 'view';
// @ts-expect-error runtime union cannot select one endpoint
b.factory({ importPath: 'pkg', importName: name });
declare const broad: string;
// @ts-expect-error broad names
b.factory({ importPath: 'pkg', importName: broad });
const extra = { importPath: 'pkg', importName: 'make' as const, extra: true };
// @ts-expect-error predeclared extra config
b.factory(extra);
declare const union: {
    importPath: string;
    importName: 'make';
} | typeof extra;
// @ts-expect-error invalid member cannot hide behind common union keys
b.factory(union);
// @ts-expect-error any witness must fail constructor
const anyModule = defineExtension<any>();
// @ts-expect-error unknown witness must fail constructor
const unknownModule = defineExtension<unknown>();
// @ts-expect-error broad index module must fail constructor
defineExtension<Record<string, () => () => void>>();
// @ts-expect-error broad union member must fail constructor
defineExtension<{
    make: () => () => void;
} | Record<string, () => () => void>>();
type ConstructOnly={create:new()=>object};
// @ts-expect-error construct-only is not a factory
defineExtension<ConstructOnly>().factory({importPath:'pkg',importName:'create'});
void [result, View, anyModule, unknownModule];
