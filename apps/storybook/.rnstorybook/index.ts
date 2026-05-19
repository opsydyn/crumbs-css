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

const StorybookUIRoot = view.getStorybookUI({
  storage: storybookStorage,
})

export default StorybookUIRoot
