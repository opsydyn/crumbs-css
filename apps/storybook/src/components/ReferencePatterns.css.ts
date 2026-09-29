import { componentRecipe, textStyle, viewStyle } from "@opsydyn/crumbs-css/style"
import { vars } from "../styles/theme"

export const root = viewStyle({
  gap: vars.space.xl,
})

export const section = viewStyle({
  backgroundColor: vars.color.panel,
  borderColor: vars.color.edge,
  borderRadius: vars.radius.lg,
  borderWidth: 1,
  gap: vars.space.md,
  padding: vars.space.lg,
})

export const sectionHeader = viewStyle({
  gap: vars.space.xs,
})

export const eyebrow = textStyle({
  color: vars.color.accent,
  fontSize: 11,
  fontWeight: "900",
  letterSpacing: 1,
  textTransform: "uppercase",
})

export const display = textStyle({
  color: vars.color.copy,
  fontSize: 28,
  fontWeight: "900",
  lineHeight: 32,
})

export const heading = textStyle({
  color: vars.color.copy,
  fontSize: 20,
  fontWeight: "800",
  lineHeight: 25,
})

export const body = textStyle({
  color: vars.color.muted,
  fontSize: 14,
  lineHeight: 20,
})

export const caption = textStyle({
  color: vars.color.muted,
  fontSize: 12,
  lineHeight: 17,
})

export const selectionStack = viewStyle({
  gap: vars.space.xs,
})

export const selectionGlyph = textStyle({
  color: vars.color.accentText,
  fontSize: 12,
  fontWeight: "900",
  lineHeight: 15,
})

export const actionButton = componentRecipe({
  contract: {
    identity: { owner: "@opsydyn/crumbs", name: "ReferenceActionButton", version: 1 },
    public: {
      slots: ["root", "leadingMark", "label"],
      variants: {
        disabled: ["false", "true"],
        pressed: ["false", "true"],
        tone: ["brand", "neutral", "quiet"],
      },
    },
  },
  slots: { root: "view", leadingMark: "text", label: "text" } as const,
  base: {
    root: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: vars.color.accent,
      borderColor: vars.color.accent,
      borderRadius: vars.radius.pill,
      borderWidth: 1,
      flexDirection: "row",
      gap: vars.space.sm,
      justifyContent: "center",
      minHeight: vars.control.height,
      paddingLeft: vars.space.md,
      paddingRight: vars.space.md,
      paddingTop: vars.space.xs,
      paddingBottom: vars.space.xs,
    },
    leadingMark: {
      color: vars.color.accentText,
      fontSize: 14,
      fontWeight: "900",
    },
    label: {
      color: vars.color.accentText,
      fontSize: 13,
      fontWeight: "900",
      letterSpacing: 0.25,
    },
  },
  variants: {
    tone: {
      brand: {},
      neutral: {
        root: {
          backgroundColor: vars.color.panelRaised,
          borderColor: vars.color.edge,
        },
        leadingMark: { color: vars.color.accent },
        label: { color: vars.color.copy },
      },
      quiet: {
        root: {
          backgroundColor: vars.color.canvas,
          borderColor: vars.color.edge,
        },
        leadingMark: { color: vars.color.accent },
        label: { color: vars.color.copy },
      },
    },
    disabled: {
      false: {},
      true: {
        root: { opacity: 0.52 },
      },
    },
    pressed: {
      false: {},
      true: { root: { opacity: 0.82 } },
    },
  },
  defaultVariants: { disabled: false, pressed: false, tone: "brand" },
  stateVariants: {
    disabled: {
      false: { pressed: [false, true] },
      true: { pressed: [false] },
    },
  },
}, "referenceActionButton")

export const inputField = componentRecipe({
  contract: {
    identity: { owner: "@opsydyn/crumbs", name: "ReferenceInputField", version: 1 },
    public: {
      slots: ["root", "label", "control", "message"],
      variants: {
        disabled: ["false", "true"],
        focused: ["false", "true"],
        invalid: ["false", "true"],
      },
    },
  },
  slots: { root: "view", label: "text", control: "text", message: "text" } as const,
  base: {
    root: { gap: vars.space.xs },
    label: {
      color: vars.color.copy,
      fontSize: 13,
      fontWeight: "800",
    },
    control: {
      backgroundColor: vars.color.canvas,
      borderColor: vars.color.edge,
      borderRadius: vars.radius.lg,
      borderWidth: 1,
      color: vars.color.copy,
      fontSize: 16,
      minHeight: vars.control.height,
      paddingLeft: vars.space.md,
      paddingRight: vars.space.md,
    },
    message: {
      color: vars.color.muted,
      fontSize: 12,
      lineHeight: 17,
    },
  },
  variants: {
    disabled: {
      false: {},
      true: { control: { opacity: 0.52 } },
    },
    focused: {
      false: {},
      true: { control: { borderColor: vars.color.accent, borderWidth: 2 } },
    },
    invalid: {
      false: {},
      true: {
        control: { borderColor: vars.color.accent },
        message: { color: vars.color.accent },
      },
    },
  },
  defaultVariants: { disabled: false, focused: false, invalid: false },
  stateVariants: {
    disabled: {
      false: { focused: [false, true] },
      true: { focused: [false] },
    },
  },
}, "referenceInputField")

export const selectionControl = componentRecipe({
  contract: {
    identity: { owner: "@opsydyn/crumbs", name: "ReferenceSelectionControl", version: 1 },
    public: {
      slots: ["root", "indicator", "label", "track", "thumb"],
      variants: {
        disabled: ["false", "true"],
        kind: ["checkbox", "radio", "switch"],
        selected: ["false", "true"],
      },
    },
  },
  slots: {
    root: "view",
    indicator: "view",
    label: "text",
    track: "view",
    thumb: "view",
  } as const,
  base: {
    root: {
      alignItems: "center",
      flexDirection: "row",
      gap: vars.space.sm,
      minHeight: vars.control.height,
    },
    indicator: {
      alignItems: "center",
      backgroundColor: vars.color.panelRaised,
      borderColor: vars.color.edge,
      borderRadius: 5,
      borderWidth: 1,
      height: 20,
      justifyContent: "center",
      width: 20,
    },
    label: {
      color: vars.color.copy,
      flex: 1,
      fontSize: 13,
      fontWeight: "700",
    },
    track: {
      backgroundColor: vars.color.panelRaised,
      borderColor: vars.color.edge,
      borderRadius: vars.radius.pill,
      borderWidth: 1,
      height: 28,
      justifyContent: "center",
      padding: 3,
      width: 48,
    },
    thumb: {
      alignSelf: "flex-start",
      backgroundColor: vars.color.copy,
      borderRadius: vars.radius.pill,
      height: 20,
      width: 20,
    },
  },
  variants: {
    disabled: {
      false: {},
      true: { root: { opacity: 0.5 } },
    },
    kind: {
      checkbox: { indicator: { borderRadius: 5 } },
      radio: { indicator: { borderRadius: vars.radius.pill } },
      switch: {},
    },
    selected: {
      false: {},
      true: {
        indicator: {
          backgroundColor: vars.color.accent,
          borderColor: vars.color.accent,
        },
        label: { fontWeight: "900" },
        track: {
          backgroundColor: vars.color.accent,
          borderColor: vars.color.accent,
        },
        thumb: {
          alignSelf: "flex-end",
          backgroundColor: vars.color.accentText,
        },
      },
    },
  },
  defaultVariants: { disabled: false, kind: "checkbox", selected: false },
}, "referenceSelectionControl")
