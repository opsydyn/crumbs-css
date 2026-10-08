import { createVar, fallbackVar } from "../src/local-vars/authoring";
import { assignVars } from "../src/local-vars/assignments";
import { createTokenContract, token } from "../src/tokens/domains";
import { createThemeContract } from "../src/theme-contract";
const id = (name: string) => ({ owner: "@fixture/types", name, version: 1 });
const color = createVar("color", id("accent")), alpha = createVar("opacity", id("alpha"));
const size = createVar("length", id("size")), display = createVar({ kind: "enum", values: ["flex", "none"] }, id("display"));
assignVars({ nested: { color, alpha, size, display } }, { nested: { color: "red", alpha: 0, size: "50%", display: "none" } });
// @ts-expect-error color must be a literal string
assignVars({ color }, { color: 1 });
// @ts-expect-error opacity must be numeric
assignVars({ alpha }, { alpha: "red" });
// @ts-expect-error missing assignment leaf
assignVars({ alpha, color }, { alpha: 1 });
// @ts-expect-error no extra assignment key
assignVars({ alpha }, { alpha: 1, color: "red" });
// @ts-expect-error enum retains finite member union
assignVars({ display }, { display: "block" });
// @ts-expect-error not a valid length literal
assignVars({ size }, { size: "red" });
// @ts-expect-error different local domains
fallbackVar(color, alpha, "red");
const vars = createTokenContract({ color: token.color(), alpha: token.opacity() });
fallbackVar(color, vars.color);
// @ts-expect-error branded references are not assignment literals
assignVars({ color }, { color: vars.color });
// @ts-expect-error mismatched terminal domain
fallbackVar(color, vars.alpha);
const legacy = createThemeContract({ color: null });
// @ts-expect-error legacy terminals have no domain authority
fallbackVar(color, legacy.color);
import { viewStyle, textStyle, imageStyle, style, styleVariants, recipe } from "../src/native-style";
import type { ViewStyle, TextStyle, ImageStyle } from "react-native";
import type { NativeLocalStylePlan, ResolvedAssignedStyles } from "../src/local-vars/model";
const localView = viewStyle({ opacity: fallbackVar(alpha, 1), backgroundColor: fallbackVar(color, "red"), transform: [{ scale: 2 }] });
const typedView: NativeLocalStylePlan<ViewStyle> = localView;
const localText = textStyle({ color, fontSize: size });
const typedText: NativeLocalStylePlan<TextStyle> = localText;
const localImage = imageStyle({ tintColor: color });
const typedImage: NativeLocalStylePlan<ImageStyle> = localImage;
const combined = viewStyle([localView, { paddingLeft: 12 }]);
const typedCombined: NativeLocalStylePlan<ViewStyle> = combined;
const generic = style([localView, { width: 12 }]);
const typedGeneric: NativeLocalStylePlan<ViewStyle> = generic;
const staticView: ViewStyle = viewStyle({ opacity: 1 });
// @ts-expect-error an unresolved local plan is not a native style
const raw: ViewStyle = localView;
// @ts-expect-error colour cannot supply an opacity property
viewStyle({ opacity: color });
// @ts-expect-error text-only property remains invalid for a view
viewStyle({ color });
// @ts-expect-error local operands stay out of structured transforms
viewStyle({ transform: [{ scale: alpha }] });
// @ts-expect-error recipes do not acquire local operands
recipe({ variants: {}, base: { opacity: alpha } });
declare const resolved: ResolvedAssignedStyles<{
  view: typeof localView;
  text: typeof localText;
  image: typeof localImage;
}>;
const nativeView: ViewStyle = resolved.view;
const nativeText: TextStyle = resolved.text;
const nativeImage: ImageStyle = resolved.image;
import { useAssignedStyles } from "../src/theme-vars";
import type { ViewProps, TextProps, ImageProps } from "react-native";
// @ts-expect-error resolve before assigning to native view props
const badViewProp: ViewProps["style"] = localView;
// @ts-expect-error resolve before assigning to native text props
const badTextProp: TextProps["style"] = localText;
// @ts-expect-error resolve before assigning to native image props
const badImageProp: ImageProps["style"] = localImage;
function HookTypes() { const assigned = useAssignedStyles({ card: localView }, assignVars({}, {})); const prop: ViewProps["style"] = assigned.card; return prop; }

const genericText: NativeLocalStylePlan<import("../src/native-style").NativeStyle> = style({ color });
const genericImage = style({ tintColor: color });
const genericVariants = styleVariants({ text: { color }, image: { tintColor: color } });
// @ts-expect-error generic local styles still require the right property domain
style({ color: alpha });
// @ts-expect-error a primitive view reference keeps generic composition restricted to view properties
style([localView, { color }]);
