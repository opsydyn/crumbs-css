import { endFileScope, setFileScope } from "@vanilla-extract/css/fileScope"
import { componentRecipe } from "../../src/native-style"

function inFileScope<T>(run: () => T): T {
  setFileScope("fixtures/m9-1-manifest/components.ts", "@acme/m9-1-manifest-fixture")
  try {
    return run()
  } finally {
    endFileScope()
  }
}

export const button = inFileScope(() => componentRecipe({
  contract: {
    identity: { owner: "@acme/ui", name: "ManifestButton", version: 1 },
    public: {
      slots: ["root", "label"],
      variants: { availability: ["enabled", "disabled"], tone: ["primary", "quiet"] },
    },
    extensionPoints: { defaults: ["tone"], slotStyles: ["root"] },
  },
  slots: { root: "view", label: "text" } as const,
  variants: {
    availability: {
      enabled: { root: { opacity: 1 } },
      disabled: { root: { opacity: 0.5 } },
    },
    tone: {
      primary: { root: { opacity: 1 } },
      quiet: { root: { opacity: 0.8 } },
    },
  },
  defaultVariants: { availability: "enabled", tone: "primary" },
  stateVariants: {
    availability: {
      enabled: { tone: ["primary", "quiet"] },
      disabled: { tone: ["quiet"] },
    },
  },
}, "manifestButton"))
