import { keyframes, style } from "@vanilla-extract/css"

const spin = keyframes({
  to: {
    transform: "rotate(360deg)",
  },
})

export const loader = style({
  animationName: spin,
})
