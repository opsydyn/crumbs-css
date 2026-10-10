import type * as Runtime from '@acme/crumbs-extensions/runtime';
import { defineExtension } from '@opsydyn/crumbs-css/extensions';
import { viewStyle } from '@opsydyn/crumbs-css/style';
import { styledView, themedView } from '@acme/crumbs-extensions/authoring';
const module = defineExtension<typeof Runtime>();
const make = module.factory({ importPath: '@acme/crumbs-extensions/runtime', importName: 'createStyledView' });
const Card = make(viewStyle({ opacity: 0.5 }));
const a = <Card testID="typed" accessibilityLabel="card" style={{ padding: 8 }}>child</Card>;
const Themed = themedView({ padding: 8 });
const b = <Themed pointerEvents="none"/>;
// @ts-expect-error View props remain View props
const wrong = <Card nonNativeProperty="bad"/>;
// @ts-expect-error factory needs one native style argument
styledView();
// @ts-expect-error wrong argument
styledView(3);
// @ts-expect-error absent name
module.factory({ importPath: '@acme/crumbs-extensions/runtime', importName: 'missing' });
// @ts-expect-error non-factory export
module.factory({ importPath: '@acme/crumbs-extensions/runtime', importName: 'getExtensionCounts' });
const name: 'createStyledView' | 'createThemedView' = Math.random() ? 'createStyledView' : 'createThemedView';
// @ts-expect-error union factory names are not one endpoint
module.factory({ importPath: '@acme/crumbs-extensions/runtime', importName: name });
const extra = Math.random() ? { importPath: '@acme/crumbs-extensions/runtime', importName: 'createStyledView' as const } : { importPath: '@acme/crumbs-extensions/runtime', importName: 'createStyledView' as const, extra: true };
// @ts-expect-error excess keys in any union member
module.factory(extra);
// @ts-expect-error any module witness cannot establish export safety
defineExtension<any>();
type AsyncRuntime={asyncFactory:()=>Promise<()=>void>};
// @ts-expect-error async runtime factories are unsupported
defineExtension<AsyncRuntime>().factory({importPath:'pkg/runtime',importName:'asyncFactory'});
void a;
void b;
