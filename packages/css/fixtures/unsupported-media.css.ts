import { style } from "@vanilla-extract/css"

export const title = style({
  color: "#c8aa6e",
  "@media": {
    "screen and (min-width: 768px)": {
      fontSize: 28,
    },
  },
})
