import { textStyle, viewStyle } from "@opsydyn/crumbs-css/style"
import { vars } from "../styles/theme"

export const root = viewStyle({
  backgroundColor: vars.color.panel,
  borderColor: vars.color.edge,
  borderRadius: vars.radius.lg,
  borderWidth: 1,
  gap: vars.space.md,
  padding: vars.space.md,
})

export const group = viewStyle({
  gap: vars.space.xs,
})

export const label = textStyle({
  color: vars.color.muted,
  fontSize: 11,
  fontWeight: "800",
  letterSpacing: 0.9,
  textTransform: "uppercase",
})

export const options = viewStyle({
  columnGap: vars.space.xs,
  flexDirection: "row",
  flexWrap: "wrap",
  rowGap: vars.space.xs,
})

export const option = viewStyle({
  alignItems: "center",
  backgroundColor: vars.color.panelRaised,
  borderColor: vars.color.edge,
  borderRadius: vars.radius.pill,
  borderWidth: 1,
  justifyContent: "center",
  minHeight: vars.control.height,
  paddingLeft: vars.space.md,
  paddingRight: vars.space.md,
})

export const optionSelected = viewStyle({
  backgroundColor: vars.color.accent,
  borderColor: vars.color.accent,
})

export const optionPressed = viewStyle({
  opacity: 0.84,
})

export const optionLabel = textStyle({
  color: vars.color.copy,
  fontSize: 13,
  fontWeight: "700",
})

export const optionLabelSelected = textStyle({
  color: vars.color.accentText,
  fontSize: 13,
  fontWeight: "900",
})
