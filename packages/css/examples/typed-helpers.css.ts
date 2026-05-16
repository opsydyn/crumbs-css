import { imageStyle, textStyle, viewStyle } from "@crumbs/css/style"
import { vars } from "./theme"

export const panel = viewStyle({
  backgroundColor: vars.color.canvas,
  padding: vars.space.screen,
})

export const title = textStyle({
  color: vars.color.text,
  fontSize: vars.space.screen,
  fontWeight: "700",
})

export const crest = imageStyle({
  height: vars.space.screen,
  resizeMode: "cover",
  tintColor: vars.color.text,
  width: vars.space.screen,
})
