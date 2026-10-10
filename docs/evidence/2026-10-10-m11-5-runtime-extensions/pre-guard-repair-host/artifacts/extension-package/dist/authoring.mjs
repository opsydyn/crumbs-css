// packages/css/fixtures/packed-distribution/extensions/src/authoring.ts
import { defineExtension } from "@opsydyn/crumbs-css/extensions";
var native = defineExtension();
var styledView = native.factory({ importPath: "@acme/crumbs-extensions/runtime", importName: "createStyledView" });
var themedView = native.factory({ importPath: "@acme/crumbs-extensions/runtime", importName: "createThemedView" });
var pureFunction = defineExtension().factory({ importPath: "@acme/crumbs-extensions/pure-runtime", importName: "make" });
export {
  pureFunction,
  styledView,
  themedView
};
