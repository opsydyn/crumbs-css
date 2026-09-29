import AsyncStorage from "@react-native-async-storage/async-storage"
import { Platform } from "react-native"
import { view } from "./storybook.requires"

const storybookStorage =
  Platform.OS === "web"
    ? {
        getItem: async (key: string) =>
          typeof window === "undefined" ? null : window.localStorage.getItem(key),
        setItem: async (key: string, value: string) => {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(key, value)
          }
        },
      }
    : {
        getItem: AsyncStorage.getItem,
        setItem: AsyncStorage.setItem,
      }

const referencePreviewOnly =
  process.env.EXPO_PUBLIC_STORYBOOK_REFERENCE_PREVIEW === "true"

const StorybookUIRoot = view.getStorybookUI({
  storage: storybookStorage,
  onDeviceUI: !referencePreviewOnly,
  initialSelection: referencePreviewOnly
    ? { kind: "Design System/Reference Patterns", name: "Interactive" }
    : undefined,
})

export default StorybookUIRoot
