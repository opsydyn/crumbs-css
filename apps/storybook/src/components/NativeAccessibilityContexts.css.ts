import { textStyle, viewStyle } from "@opsydyn/crumbs-css/style"
import { vars } from "../styles/theme"

export const section = viewStyle({
  backgroundColor: vars.color.panel,
  borderColor: vars.color.edge,
  borderRadius: vars.radius.lg,
  borderWidth: 1,
  gap: vars.space.md,
  padding: vars.space.lg,
})

export const heading = viewStyle({ gap: vars.space.xs })

export const kicker = textStyle({
  color: vars.color.accent,
  fontSize: 11,
  fontWeight: "900",
  letterSpacing: 1,
  textTransform: "uppercase",
})

export const title = textStyle({
  color: vars.color.copy,
  fontSize: 20,
  fontWeight: "800",
  lineHeight: 25,
})

export const body = textStyle({
  color: vars.color.muted,
  fontSize: 14,
  lineHeight: 20,
})

export const example = viewStyle({ gap: vars.space.sm })

export const exampleTitle = textStyle({
  color: vars.color.copy,
  fontSize: 16,
  fontWeight: "800",
})

export const scalingText = textStyle({
  color: vars.color.copy,
  fontSize: 18,
  lineHeight: 27,
})

export const logicalPreview = viewStyle({
  alignItems: "center",
  backgroundColor: vars.color.panelRaised,
  borderColor: vars.color.edge,
  borderRadius: vars.radius.lg,
  borderWidth: 1,
  flexDirection: "row",
  justifyContent: "space-between",
  paddingBlock: vars.space.sm,
  paddingInlineEnd: vars.space.sm,
  paddingInlineStart: vars.space.lg,
})

export const logicalStart = textStyle({
  color: vars.color.accent,
  fontSize: 14,
  fontWeight: "800",
})

export const logicalEnd = textStyle({
  color: vars.color.copy,
  fontSize: 14,
  fontWeight: "800",
})

export const motionTrack = viewStyle({
  backgroundColor: vars.color.panelRaised,
  borderColor: vars.color.edge,
  borderRadius: vars.radius.pill,
  borderWidth: 1,
  height: 32,
  direction: "ltr",
  justifyContent: "center",
  padding: 3,
  width: 152,
})

export const motionMarker = viewStyle({
  backgroundColor: vars.color.accent,
  borderRadius: vars.radius.pill,
  height: 24,
  width: 24,
})

export const contrastPreview = viewStyle({
  backgroundColor: vars.color.panel,
  borderColor: vars.color.edge,
  borderRadius: vars.radius.lg,
  borderWidth: 1,
  gap: vars.space.xs,
  padding: vars.space.md,
})

export const contrastCopy = textStyle({
  color: vars.color.copy,
  fontSize: 14,
  lineHeight: 20,
})

export const contrastMuted = textStyle({
  color: vars.color.muted,
  fontSize: 14,
  lineHeight: 20,
})

export const contrastAccent = textStyle({
  color: vars.color.accent,
  fontSize: 14,
  fontWeight: "800",
})
