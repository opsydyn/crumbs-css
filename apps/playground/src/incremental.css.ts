import { viewStyle } from "@opsydyn/crumbs-css/style"
import { incrementalPadding } from "./incremental-token"
import { incrementalBase } from "./incremental-base.css"
import { workspaceBorderWidth } from "../../../packages/css/fixtures/m2-7-workspace-token"

export const incrementalProbe = viewStyle([incrementalBase, { padding: incrementalPadding, borderWidth: workspaceBorderWidth }])
