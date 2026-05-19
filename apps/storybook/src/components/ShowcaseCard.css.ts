import { textStyle, viewStyle } from "@opsydyn/crumbs-css/style"
import { vars } from "../styles/theme"

export const card = viewStyle({
  backgroundColor: vars.color.panel,
  borderColor: vars.color.edge,
  borderRadius: vars.radius.lg,
  borderWidth: 1,
  gap: vars.space.md,
  padding: vars.space.xl,
})

export const badge = viewStyle({
  alignSelf: "flex-start",
  backgroundColor: vars.color.accent,
  borderRadius: vars.radius.pill,
  paddingBottom: vars.space.xs,
  paddingLeft: vars.space.sm,
  paddingRight: vars.space.sm,
  paddingTop: vars.space.xs,
})

export const badgeLabel = textStyle({
  color: vars.color.accentText,
  fontSize: 11,
  fontWeight: "900",
  letterSpacing: 1,
  textTransform: "uppercase",
})

export const eyebrow = textStyle({
  color: vars.color.accent,
  fontSize: 12,
  fontWeight: "800",
  letterSpacing: 1.1,
  textTransform: "uppercase",
})

export const title = textStyle({
  color: vars.color.copy,
  fontSize: 30,
  fontWeight: "900",
  lineHeight: 34,
})

export const body = textStyle({
  color: vars.color.muted,
  fontSize: 16,
  lineHeight: 23,
})

export const metaRow = viewStyle({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: vars.space.sm,
})

export const metaPill = viewStyle({
  backgroundColor: vars.color.panelRaised,
  borderColor: vars.color.edge,
  borderRadius: vars.radius.pill,
  borderWidth: 1,
  paddingBottom: vars.space.xs,
  paddingLeft: vars.space.sm,
  paddingRight: vars.space.sm,
  paddingTop: vars.space.xs,
})

export const metaPillLabel = textStyle({
  color: vars.color.copy,
  fontSize: 12,
  fontWeight: "700",
})

export const action = viewStyle({
  alignItems: "center",
  alignSelf: "flex-start",
  backgroundColor: vars.color.accent,
  borderRadius: vars.radius.pill,
  justifyContent: "center",
  minHeight: 48,
  paddingLeft: vars.space.lg,
  paddingRight: vars.space.lg,
})

export const actionPressed = viewStyle({
  opacity: 0.88,
})

export const actionLabel = textStyle({
  color: vars.color.accentText,
  fontSize: 14,
  fontWeight: "900",
  letterSpacing: 0.8,
  textTransform: "uppercase",
})
