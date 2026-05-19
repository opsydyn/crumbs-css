import { textStyle, viewStyle } from "@crumbs/css/style"
import { vars } from "../styles/theme"

export const screen = viewStyle({
  backgroundColor: vars.color.canvas,
  flex: 1,
})

export const content = viewStyle({
  padding: vars.space.xl,
  paddingBottom: vars.space.xl,
})

export const stack = viewStyle({
  gap: vars.space.lg,
})

export const headingRow = viewStyle({
  gap: vars.space.sm,
})

export const kicker = textStyle({
  color: vars.color.accent,
  fontSize: 12,
  fontWeight: "900",
  letterSpacing: 1.2,
  textTransform: "uppercase",
})

export const title = textStyle({
  color: vars.color.copy,
  fontSize: 36,
  fontWeight: "900",
  lineHeight: 40,
})

export const body = textStyle({
  color: vars.color.muted,
  fontSize: 16,
  lineHeight: 23,
})
