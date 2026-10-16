import type { ReactElement } from "react";
import type { ViewProps, ViewStyle } from "react-native";
import { Image, Text, View, Animated } from "react-native";
import {
  viewStyle,
  textStyle,
  imageStyle,
  recipe,
  defineProperties,
  createSprinkles,
  createThemeContract,
  createTheme,
} from "@opsydyn/crumbs-css/style";
import { ThemeProvider, useThemedStyles } from "@opsydyn/crumbs-css/theme/core";
import {
  defineContainer,
  useContainerLayout,
  ContainerProvider,
} from "@opsydyn/crumbs-css/theme/containers";
import { defineMotion } from "@opsydyn/crumbs-css/theme/motion";
import { useNativeMotion } from "@opsydyn/crumbs-css/theme/motion/native";
import { defineExtension } from "@opsydyn/crumbs-css/extensions";
import { resolveRecipeStyle } from "@opsydyn/crumbs-css/theme/recipes";
const properties = defineProperties({
  primitives: ["view"] as const,
  properties: { padding: { small: 8, large: 16 } },
});
const sprinkles = createSprinkles(properties);
const utility = sprinkles({ padding: "small" });
// @ts-expect-error finite utility selection
sprinkles({ padding: "huge" });
const button = recipe({
  base: utility,
  variants: {
    size: {
      small: viewStyle({ padding: 8 }),
      large: viewStyle({ padding: 16 }),
    },
  },
});
const contract = createThemeContract({ color: { canvas: null } });
const theme = createTheme(contract, { color: { canvas: "#ffffff" } });
type Runtime = {
  createCard: (style: ViewStyle) => (props: ViewProps) => ReactElement;
};
const Card = defineExtension<Runtime>().factory({
  importPath: "@acme/strict-runtime",
  importName: "createCard",
})(viewStyle({ padding: 8 }));
// @ts-expect-error explicit runtime exports only
defineExtension<Runtime>().factory({
  importPath: "@acme/strict-runtime",
  importName: "missing",
});
const box = viewStyle({
  padding: 8,
  transform: [{ translateX: 2 }],
  shadowOffset: { width: 1, height: 2 },
});
const text = textStyle({
  fontFamily: "System",
  fontWeight: "600",
  fontSize: 16,
});
const image = imageStyle({ resizeMode: "contain", tintColor: "#ffffff" });
// @ts-expect-error cross-primitive property is not a View style
viewStyle({ fontWeight: "600" });
// @ts-expect-error cross-primitive property is not a Text style
textStyle({ resizeMode: "cover" });
// @ts-expect-error variable font axes are not a qualified Crumbs structured property
textStyle({ fontVariationSettings: { wght: 650 } });
const states = defineMotion({
  states: { idle: { opacity: 1 }, active: { opacity: 0.5 } },
  transition: { duration: 100, easing: "linear" },
});
const container = defineContainer({
  owner: "crumbs",
  name: "strict-sdk",
  version: 1,
  axis: "width",
  buckets: { small: 0, large: 400 },
});
function StrictContents() {
  const styles = useThemedStyles({ box, text, image, button });
  const selected = resolveRecipeStyle(styles.button, { size: "large" });
  const layout = useContainerLayout(container);
  const motion = useNativeMotion(states, { initial: "idle", motion: "full" });
  return (
    <ContainerProvider layout={layout}>
      <View style={[styles.box, ...selected]} onLayout={layout.onLayout}>
        <Text style={styles.text}>SDK</Text>
        <Image style={styles.image} source={{ uri: "test" }} />
        <Animated.View style={motion.style} />
        <Card testID="typed" />
      </View>
    </ContainerProvider>
  );
}

export function StrictConsumer() {
  return (
    <ThemeProvider theme={theme}>
      <StrictContents />
    </ThemeProvider>
  );
}
