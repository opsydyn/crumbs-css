import { style } from "@vanilla-extract/css"

export const container = style({
  flex: 1,
  backgroundColor: "#0a0a0a",
  padding: 24,
})

export const title = style({
  color: "#c8aa6e",
  fontSize: 24,
  fontWeight: "700",
  marginBottom: 8,
})

export const body = style({
  color: "#888888",
  fontSize: 14,
  lineHeight: 1.5,
})
