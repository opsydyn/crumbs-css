import { textStyle, viewStyle } from "@opsydyn/crumbs-css/style"
import { vars } from "../styles/theme"

export const trigger = viewStyle({
  alignItems: "center",
  backgroundColor: vars.color.panelRaised,
  borderColor: vars.color.edge,
  borderRadius: vars.radius.lg,
  borderWidth: 1,
  flexDirection: "row",
  justifyContent: "space-between",
  minHeight: 64,
  paddingBottom: vars.space.sm,
  paddingLeft: vars.space.md,
  paddingRight: vars.space.md,
  paddingTop: vars.space.sm,
})

export const triggerOpen = viewStyle({
  backgroundColor: vars.color.accentMuted,
  borderColor: vars.color.accent,
})

export const triggerPressed = viewStyle({
  opacity: 0.88,
})

export const triggerCopy = viewStyle({
  gap: vars.space.xs,
})

export const triggerLabel = textStyle({
  color: vars.color.muted,
  fontSize: 12,
  fontWeight: "700",
  letterSpacing: 1,
  textTransform: "uppercase",
})

export const triggerValue = textStyle({
  color: vars.color.copy,
  fontSize: 20,
  fontWeight: "900",
})

export const triggerHint = textStyle({
  color: vars.color.accent,
  fontSize: 13,
  fontWeight: "800",
  letterSpacing: 0.5,
  textTransform: "uppercase",
})

export const menuOverlay = viewStyle({
  backgroundColor: "rgba(7, 6, 5, 0.46)",
})

export const menuContent = viewStyle({
  backgroundColor: vars.color.panel,
  borderColor: vars.color.edge,
  borderRadius: vars.radius.lg,
  borderWidth: 1,
  gap: vars.space.xs,
  minWidth: 260,
  padding: vars.space.sm,
})

export const menuLabel = textStyle({
  color: vars.color.muted,
  fontSize: 11,
  fontWeight: "800",
  letterSpacing: 1,
  paddingBottom: vars.space.xs,
  paddingLeft: vars.space.xs,
  textTransform: "uppercase",
})

export const menuItem = viewStyle({
  backgroundColor: vars.color.panelRaised,
  borderColor: vars.color.edge,
  borderRadius: 18,
  borderWidth: 1,
  paddingBottom: vars.space.sm,
  paddingLeft: vars.space.md,
  paddingRight: vars.space.md,
  paddingTop: vars.space.sm,
})

export const menuItemActive = viewStyle({
  backgroundColor: vars.color.accentMuted,
  borderColor: vars.color.accent,
})

export const menuItemPressed = viewStyle({
  opacity: 0.88,
})

export const menuItemRow = viewStyle({
  alignItems: "center",
  flexDirection: "row",
  gap: vars.space.sm,
  justifyContent: "space-between",
})

export const menuItemCopy = viewStyle({
  flex: 1,
  gap: vars.space.xs,
})

export const menuItemTitle = textStyle({
  color: vars.color.copy,
  fontSize: 16,
  fontWeight: "800",
})

export const menuItemTitleActive = textStyle({
  color: vars.color.copy,
  fontSize: 16,
  fontWeight: "900",
})

export const menuItemBody = textStyle({
  color: vars.color.muted,
  fontSize: 13,
  lineHeight: 18,
})

export const menuItemBodyActive = textStyle({
  color: vars.color.copy,
  fontSize: 13,
  lineHeight: 18,
})

export const menuIndicator = viewStyle({
  backgroundColor: vars.color.accent,
  borderRadius: vars.radius.pill,
  paddingBottom: vars.space.xs,
  paddingLeft: vars.space.sm,
  paddingRight: vars.space.sm,
  paddingTop: vars.space.xs,
})

export const menuIndicatorText = textStyle({
  color: vars.color.accentText,
  fontSize: 11,
  fontWeight: "900",
  letterSpacing: 0.8,
  textTransform: "uppercase",
})
