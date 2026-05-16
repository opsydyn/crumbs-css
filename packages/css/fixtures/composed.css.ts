import { style } from "@vanilla-extract/css"

const base = style({ color: "#c8aa6e", fontSize: 14 })

export const btn = style([base, { fontWeight: "700" }])
export const title = style({ fontSize: 24, color: "white" })
