import { style } from "@vanilla-extract/css"

export const title = style({
  color: "#c8aa6e",
  selectors: {
    "&:hover": {
      color: "#ffffff",
    },
  },
})
