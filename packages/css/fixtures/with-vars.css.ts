import { createVar, style } from "@vanilla-extract/css"

const gold = createVar()

export const btn = style({
  // CSS var — will be stripped with a dev warning
  color: gold,
  // Plain value — should survive
  fontSize: 16,
})
