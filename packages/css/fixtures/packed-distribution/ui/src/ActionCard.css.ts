import { componentRecipe, viewStyle } from "@opsydyn/crumbs-css/style"
import { vars } from "@acme/design-tokens"

export const card = viewStyle({
  backgroundColor: vars.color.canvas,
  borderRadius: vars.radius.md,
  gap: vars.space.md,
  padding: vars.space.md,
})

export const action = componentRecipe({
  contract: {
    identity: { owner: "@acme/ui", name: "ActionCard", version: 1 },
    public: {
      slots: ["root", "label"],
      variants: { disabled: ["false", "true"], pressed: ["false", "true"] },
    },
  },
  slots: { root: "view", label: "text" } as const,
  base: {
    root: {
      alignItems: "center",
      backgroundColor: vars.color.accent,
      borderRadius: vars.radius.md,
      justifyContent: "center",
      minHeight: 48,
      paddingHorizontal: vars.space.md,
    },
    label: { color: vars.color.onAccent, fontWeight: "700" },
  },
  variants: {
    disabled: {
      false: {},
      true: {
        root: { opacity: 0.5 },
        label: { color: vars.color.muted },
      },
    },
    pressed: {
      false: {},
      true: { root: { opacity: 0.85 } },
    },
  },
  defaultVariants: { disabled: false, pressed: false },
  stateVariants: {
    disabled: {
      false: { pressed: [false, true] },
      true: { pressed: [false] },
    },
  },
}, "packedActionCard")
