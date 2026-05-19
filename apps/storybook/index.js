import "react-native-gesture-handler"
import { registerRootComponent } from "expo"

const AppEntry =
  process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === "true"
    ? require("./.rnstorybook").default
    : require("./src/App").default

registerRootComponent(AppEntry)
