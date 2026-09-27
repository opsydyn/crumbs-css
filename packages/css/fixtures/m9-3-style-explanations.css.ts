import { createThemeContract, viewStyle } from "@opsydyn/crumbs-css/style"

const vars = createThemeContract({ space: { small: null } })

const base = viewStyle({ opacity: 0.25, paddingHorizontal: vars.space.small })
const override = viewStyle({ opacity: 0.8 })

export const card = viewStyle([base, override])
