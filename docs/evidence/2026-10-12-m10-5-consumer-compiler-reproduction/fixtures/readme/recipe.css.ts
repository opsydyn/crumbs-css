import { recipe } from "@opsydyn/crumbs-css/style"
import { vars } from "./theme"

export const button = recipe({
  base: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
  },
  compoundVariants: [
    {
      style: {
        opacity: 0.5,
      },
      variants: {
        disabled: true,
        tone: "primary",
      },
    },
  ],
  defaultVariants: {
    disabled: false,
    pressed: false,
    size: "md",
    tone: "primary",
  },
  variants: {
    disabled: {
      false: {},
      true: {
        opacity: 0.6,
      },
    },
    pressed: {
      false: {},
      true: {
        opacity: 0.82,
      },
    },
    size: {
      md: {
        paddingBottom: vars.space.screen,
        paddingLeft: vars.space.screen,
        paddingRight: vars.space.screen,
        paddingTop: vars.space.screen,
      },
      sm: {
        paddingBottom: 8,
        paddingLeft: 12,
        paddingRight: 12,
        paddingTop: 8,
      },
    },
    tone: {
      danger: {
        backgroundColor: "#9f2f25",
      },
      primary: {
        backgroundColor: vars.color.accent,
      },
    },
  },
})
