import { textStyle, viewStyle } from "@crumbs/css/style"
import { vars } from "../styles/theme"

export const intro = viewStyle({
  gap: vars.space.sm,
})

export const introKicker = textStyle({
  color: vars.color.accent,
  fontSize: 12,
  fontWeight: "900",
  letterSpacing: 1.1,
  textTransform: "uppercase",
})

export const introTitle = textStyle({
  color: vars.color.copy,
  fontSize: 28,
  fontWeight: "900",
  lineHeight: 32,
})

export const introBody = textStyle({
  color: vars.color.muted,
  fontSize: 15,
  lineHeight: 22,
})

export const gallery = viewStyle({
  gap: vars.space.xl,
})

export const section = viewStyle({
  gap: vars.space.md,
})

export const sectionHeader = viewStyle({
  alignItems: "center",
  flexDirection: "row",
  gap: vars.space.sm,
  justifyContent: "space-between",
})

export const sectionTitle = textStyle({
  color: vars.color.copy,
  fontSize: 20,
  fontWeight: "900",
})

export const sectionCount = textStyle({
  color: vars.color.muted,
  fontSize: 12,
  fontWeight: "800",
  letterSpacing: 0.8,
  textTransform: "uppercase",
})

export const sectionStack = viewStyle({
  gap: vars.space.md,
})

export const card = viewStyle({
  backgroundColor: vars.color.panel,
  borderColor: vars.color.edge,
  borderRadius: vars.radius.lg,
  borderWidth: 1,
  gap: vars.space.md,
  padding: vars.space.lg,
})

export const cardHeader = viewStyle({
  gap: vars.space.sm,
})

export const packagePill = viewStyle({
  alignSelf: "flex-start",
  backgroundColor: vars.color.panelRaised,
  borderColor: vars.color.edge,
  borderRadius: vars.radius.pill,
  borderWidth: 1,
  paddingBottom: vars.space.xs,
  paddingLeft: vars.space.sm,
  paddingRight: vars.space.sm,
  paddingTop: vars.space.xs,
})

export const packagePillLabel = textStyle({
  color: vars.color.accent,
  fontSize: 11,
  fontWeight: "900",
  letterSpacing: 0.8,
})

export const cardTitle = textStyle({
  color: vars.color.copy,
  fontSize: 22,
  fontWeight: "900",
  lineHeight: 26,
})

export const cardBody = textStyle({
  color: vars.color.muted,
  fontSize: 14,
  lineHeight: 20,
})

export const cardHint = textStyle({
  color: vars.color.accent,
  fontSize: 12,
  fontWeight: "700",
  lineHeight: 18,
})

export const preview = viewStyle({
  backgroundColor: vars.color.panelRaised,
  borderColor: vars.color.edge,
  borderRadius: 20,
  borderWidth: 1,
  gap: vars.space.sm,
  padding: vars.space.md,
})

export const stack = viewStyle({
  gap: vars.space.md,
})

export const stackSm = viewStyle({
  gap: vars.space.sm,
})

export const row = viewStyle({
  alignItems: "center",
  flexDirection: "row",
  gap: vars.space.sm,
})

export const rowWrap = viewStyle({
  alignItems: "center",
  columnGap: vars.space.sm,
  flexDirection: "row",
  flexWrap: "wrap",
  rowGap: vars.space.sm,
})

export const rowBetween = viewStyle({
  alignItems: "center",
  flexDirection: "row",
  gap: vars.space.sm,
  justifyContent: "space-between",
})

export const field = viewStyle({
  backgroundColor: vars.color.canvas,
  borderColor: vars.color.edge,
  borderRadius: 18,
  borderWidth: 1,
  paddingBottom: vars.space.sm,
  paddingLeft: vars.space.md,
  paddingRight: vars.space.md,
  paddingTop: vars.space.sm,
})

export const inset = viewStyle({
  backgroundColor: vars.color.canvas,
  borderColor: vars.color.edge,
  borderRadius: 18,
  borderWidth: 1,
  gap: vars.space.sm,
  padding: vars.space.md,
})

export const button = viewStyle({
  alignItems: "center",
  alignSelf: "flex-start",
  backgroundColor: vars.color.accent,
  borderColor: vars.color.accent,
  borderRadius: vars.radius.pill,
  borderWidth: 1,
  justifyContent: "center",
  minHeight: 42,
  minWidth: 42,
  paddingLeft: vars.space.md,
  paddingRight: vars.space.md,
  paddingTop: vars.space.sm,
  paddingBottom: vars.space.sm,
})

export const buttonSecondary = viewStyle({
  alignItems: "center",
  alignSelf: "flex-start",
  backgroundColor: vars.color.panel,
  borderColor: vars.color.edge,
  borderRadius: vars.radius.pill,
  borderWidth: 1,
  justifyContent: "center",
  minHeight: 42,
  minWidth: 42,
  paddingLeft: vars.space.md,
  paddingRight: vars.space.md,
  paddingTop: vars.space.sm,
  paddingBottom: vars.space.sm,
})

export const buttonGhost = viewStyle({
  alignItems: "center",
  alignSelf: "flex-start",
  backgroundColor: vars.color.canvas,
  borderColor: vars.color.edge,
  borderRadius: vars.radius.pill,
  borderWidth: 1,
  justifyContent: "center",
  minHeight: 38,
  minWidth: 38,
  paddingLeft: vars.space.sm,
  paddingRight: vars.space.sm,
  paddingTop: vars.space.xs,
  paddingBottom: vars.space.xs,
})

export const buttonActive = viewStyle({
  backgroundColor: vars.color.accentMuted,
  borderColor: vars.color.accent,
})

export const buttonPressed = viewStyle({
  opacity: 0.86,
})

export const buttonText = textStyle({
  color: vars.color.copy,
  fontSize: 13,
  fontWeight: "800",
  letterSpacing: 0.2,
})

export const buttonTextActive = textStyle({
  color: vars.color.copy,
  fontSize: 13,
  fontWeight: "900",
  letterSpacing: 0.2,
})

export const buttonTextInverted = textStyle({
  color: vars.color.accentText,
  fontSize: 13,
  fontWeight: "900",
  letterSpacing: 0.2,
})

export const titleText = textStyle({
  color: vars.color.copy,
  fontSize: 16,
  fontWeight: "800",
})

export const titleTextStrong = textStyle({
  color: vars.color.copy,
  fontSize: 16,
  fontWeight: "900",
})

export const bodyText = textStyle({
  color: vars.color.muted,
  fontSize: 13,
  lineHeight: 19,
})

export const bodyTextStrong = textStyle({
  color: vars.color.copy,
  fontSize: 13,
  lineHeight: 19,
})

export const smallCopy = textStyle({
  color: vars.color.muted,
  fontSize: 12,
  lineHeight: 17,
})

export const smallCopyStrong = textStyle({
  color: vars.color.copy,
  fontSize: 12,
  fontWeight: "700",
  lineHeight: 17,
})

export const smallLabel = textStyle({
  color: vars.color.muted,
  fontSize: 11,
  fontWeight: "900",
  letterSpacing: 0.8,
  textTransform: "uppercase",
})

export const accentCopy = textStyle({
  color: vars.color.accent,
  fontSize: 12,
  fontWeight: "800",
  lineHeight: 17,
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

export const badgeText = textStyle({
  color: vars.color.accentText,
  fontSize: 11,
  fontWeight: "900",
  letterSpacing: 0.8,
  textTransform: "uppercase",
})

export const overlay = viewStyle({
  backgroundColor: "rgba(7, 6, 5, 0.46)",
})

export const menuContent = viewStyle({
  backgroundColor: vars.color.panel,
  borderColor: vars.color.edge,
  borderRadius: vars.radius.lg,
  borderWidth: 1,
  gap: vars.space.xs,
  minWidth: 240,
  padding: vars.space.sm,
})

export const menuLabel = textStyle({
  color: vars.color.muted,
  fontSize: 11,
  fontWeight: "900",
  letterSpacing: 1,
  paddingBottom: vars.space.xs,
  paddingLeft: vars.space.xs,
  textTransform: "uppercase",
})

export const menuItem = viewStyle({
  backgroundColor: vars.color.panelRaised,
  borderColor: vars.color.edge,
  borderRadius: 16,
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

export const aspectFrame = viewStyle({
  backgroundColor: vars.color.canvas,
  borderColor: vars.color.edge,
  borderRadius: 18,
  borderWidth: 1,
  overflow: "hidden",
})

export const aspectFill = viewStyle({
  alignItems: "center",
  backgroundColor: vars.color.accentMuted,
  flex: 1,
  gap: vars.space.xs,
  justifyContent: "center",
})

export const avatarRoot = viewStyle({
  alignItems: "center",
  backgroundColor: vars.color.canvas,
  borderColor: vars.color.edge,
  borderRadius: vars.radius.pill,
  borderWidth: 1,
  height: 72,
  justifyContent: "center",
  overflow: "hidden",
  width: 72,
})

export const avatarFallback = viewStyle({
  alignItems: "center",
  backgroundColor: vars.color.accent,
  flex: 1,
  justifyContent: "center",
  width: "100%",
})

export const avatarFallbackText = textStyle({
  color: vars.color.accentText,
  fontSize: 22,
  fontWeight: "900",
})

export const checkboxRoot = viewStyle({
  alignItems: "center",
  backgroundColor: vars.color.canvas,
  borderColor: vars.color.edge,
  borderRadius: 12,
  borderWidth: 1,
  height: 28,
  justifyContent: "center",
  width: 28,
})

export const checkboxRootChecked = viewStyle({
  backgroundColor: vars.color.accent,
  borderColor: vars.color.accent,
})

export const checkboxIndicator = viewStyle({
  alignItems: "center",
  justifyContent: "center",
})

export const checkboxIndicatorText = textStyle({
  color: vars.color.accentText,
  fontSize: 11,
  fontWeight: "900",
})

export const collapsibleContent = viewStyle({
  gap: vars.space.sm,
  paddingTop: vars.space.sm,
})

export const dialogContent = viewStyle({
  alignSelf: "center",
  backgroundColor: vars.color.panel,
  borderColor: vars.color.edge,
  borderRadius: vars.radius.lg,
  borderWidth: 1,
  gap: vars.space.md,
  margin: vars.space.lg,
  maxWidth: 360,
  padding: vars.space.lg,
})

export const actionRow = viewStyle({
  columnGap: vars.space.sm,
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  rowGap: vars.space.sm,
})

export const progressTrack = viewStyle({
  backgroundColor: vars.color.canvas,
  borderColor: vars.color.edge,
  borderRadius: vars.radius.pill,
  borderWidth: 1,
  height: 18,
  overflow: "hidden",
  width: "100%",
})

export const progressIndicator = viewStyle({
  backgroundColor: vars.color.accent,
  height: "100%",
})

export const radioItem = viewStyle({
  alignItems: "center",
  backgroundColor: vars.color.canvas,
  borderColor: vars.color.edge,
  borderRadius: vars.radius.pill,
  borderWidth: 1,
  flexDirection: "row",
  gap: vars.space.sm,
  minHeight: 40,
  paddingBottom: vars.space.sm,
  paddingLeft: vars.space.md,
  paddingRight: vars.space.md,
  paddingTop: vars.space.sm,
})

export const radioItemSelected = viewStyle({
  backgroundColor: vars.color.accentMuted,
  borderColor: vars.color.accent,
})

export const radioIndicator = viewStyle({
  alignItems: "center",
  backgroundColor: vars.color.canvas,
  borderColor: vars.color.edge,
  borderRadius: vars.radius.pill,
  borderWidth: 1,
  height: 18,
  justifyContent: "center",
  width: 18,
})

export const radioIndicatorSelected = viewStyle({
  backgroundColor: vars.color.accent,
  borderColor: vars.color.accent,
})

export const radioIndicatorDot = textStyle({
  color: vars.color.accentText,
  fontSize: 9,
  fontWeight: "900",
})

export const selectTrigger = viewStyle({
  alignItems: "center",
  backgroundColor: vars.color.panel,
  borderColor: vars.color.edge,
  borderRadius: 18,
  borderWidth: 1,
  flexDirection: "row",
  justifyContent: "space-between",
  minHeight: 48,
  paddingBottom: vars.space.sm,
  paddingLeft: vars.space.md,
  paddingRight: vars.space.md,
  paddingTop: vars.space.sm,
})

export const selectValue = textStyle({
  color: vars.color.copy,
  fontSize: 15,
  fontWeight: "800",
})

export const separator = viewStyle({
  alignSelf: "stretch",
  backgroundColor: vars.color.edge,
  height: 1,
})

export const separatorVertical = viewStyle({
  backgroundColor: vars.color.edge,
  height: 22,
  width: 1,
})

export const sliderTrack = viewStyle({
  backgroundColor: vars.color.canvas,
  borderColor: vars.color.edge,
  borderRadius: vars.radius.pill,
  borderWidth: 1,
  height: 12,
  width: "100%",
})

export const sliderRange = viewStyle({
  backgroundColor: vars.color.accent,
  borderRadius: vars.radius.pill,
  height: "100%",
})

export const sliderThumb = viewStyle({
  backgroundColor: vars.color.accent,
  borderColor: vars.color.accentText,
  borderRadius: vars.radius.pill,
  borderWidth: 2,
  height: 22,
  width: 22,
})

export const switchRoot = viewStyle({
  alignItems: "center",
  backgroundColor: vars.color.canvas,
  borderColor: vars.color.edge,
  borderRadius: vars.radius.pill,
  borderWidth: 1,
  flexDirection: "row",
  height: 34,
  justifyContent: "flex-start",
  paddingLeft: 4,
  paddingRight: 4,
  width: 62,
})

export const switchRootChecked = viewStyle({
  backgroundColor: vars.color.accentMuted,
  borderColor: vars.color.accent,
  justifyContent: "flex-end",
})

export const switchThumb = viewStyle({
  backgroundColor: vars.color.copy,
  borderRadius: vars.radius.pill,
  height: 24,
  width: 24,
})

export const tableRoot = viewStyle({
  borderColor: vars.color.edge,
  borderRadius: 18,
  borderWidth: 1,
  overflow: "hidden",
})

export const tableHeader = viewStyle({
  backgroundColor: vars.color.canvas,
  paddingBottom: vars.space.sm,
  paddingLeft: vars.space.md,
  paddingRight: vars.space.md,
  paddingTop: vars.space.sm,
})

export const tableRow = viewStyle({
  backgroundColor: vars.color.panel,
  flexDirection: "row",
})

export const tableRowAlt = viewStyle({
  backgroundColor: vars.color.panelRaised,
})

export const tableCell = viewStyle({
  flex: 1,
  minHeight: 44,
  paddingBottom: vars.space.sm,
  paddingLeft: vars.space.md,
  paddingRight: vars.space.md,
  paddingTop: vars.space.sm,
})

export const tableCellEdge = viewStyle({
  borderLeftColor: vars.color.edge,
  borderLeftWidth: 1,
})

export const tabsList = viewStyle({
  columnGap: vars.space.sm,
  flexDirection: "row",
  flexWrap: "wrap",
  rowGap: vars.space.sm,
})

export const tabTrigger = viewStyle({
  alignItems: "center",
  backgroundColor: vars.color.canvas,
  borderColor: vars.color.edge,
  borderRadius: vars.radius.pill,
  borderWidth: 1,
  justifyContent: "center",
  minHeight: 40,
  paddingLeft: vars.space.md,
  paddingRight: vars.space.md,
  paddingTop: vars.space.sm,
  paddingBottom: vars.space.sm,
})

export const tabTriggerActive = viewStyle({
  backgroundColor: vars.color.accentMuted,
  borderColor: vars.color.accent,
})

export const toast = viewStyle({
  backgroundColor: vars.color.panel,
  borderColor: vars.color.accent,
  borderRadius: 18,
  borderWidth: 1,
  gap: vars.space.sm,
  padding: vars.space.md,
})

export const navViewport = viewStyle({
  alignSelf: "stretch",
  backgroundColor: vars.color.canvas,
  borderColor: vars.color.edge,
  borderRadius: 16,
  borderWidth: 1,
  minHeight: 12,
})

export const navIndicator = viewStyle({
  alignSelf: "flex-start",
  backgroundColor: vars.color.accent,
  borderRadius: vars.radius.pill,
  height: 4,
  width: 42,
})

export const toolbarRoot = viewStyle({
  alignItems: "center",
  backgroundColor: vars.color.canvas,
  borderColor: vars.color.edge,
  borderRadius: 18,
  borderWidth: 1,
  columnGap: vars.space.sm,
  flexDirection: "row",
  flexWrap: "wrap",
  paddingBottom: vars.space.sm,
  paddingLeft: vars.space.md,
  paddingRight: vars.space.md,
  paddingTop: vars.space.sm,
  rowGap: vars.space.sm,
})