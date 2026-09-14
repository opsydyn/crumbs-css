import { style, styleVariants } from "@opsydyn/crumbs-css/style"

const generic = style({ opacity: 0.5 })
// Existing NativeStyle references work in arrays but fail the direct type check.
export const array = style([generic])
export const direct = style(generic)
export const variants = styleVariants({ direct: generic, array: [generic] })
