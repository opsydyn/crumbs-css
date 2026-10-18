import type { ExplainStyleInput, StyleExplanationPath, StyleExplanationReport } from "../style-explanation-model"
export type CrumbsInspectorTargetId = string & { readonly __crumbsInspectorTarget: unique symbol }
export type CrumbsInspectorInput = Omit<ExplainStyleInput, "previous">
export type CrumbsInspectorTargetOptions = {
  readonly label: string
  readonly exportPath: StyleExplanationPath
  readonly getInput: () => CrumbsInspectorInput
}
export type CrumbsDevtoolsCapture = {
  readonly type: "crumbs.devtools.capture"
  readonly version: 1
  readonly target: { readonly instanceId: CrumbsInspectorTargetId; readonly label: string }
  readonly revision: number
  readonly report: StyleExplanationReport
}
export type CrumbsDevtoolsWidgetProps = {
  readonly placement?: "top-left" | "top-right" | "bottom-left" | "bottom-right"
  readonly insets?: { readonly top?: number; readonly right?: number; readonly bottom?: number; readonly left?: number }
  readonly copyText: (text: string) => Promise<void>
  readonly redactReport?: (capture: CrumbsDevtoolsCapture) => unknown
}
export type TargetSummary = { readonly id: CrumbsInspectorTargetId; readonly label: string; readonly exportPath: StyleExplanationPath; readonly revision: number }
export type InspectorSnapshot = {
  readonly targets: readonly TargetSummary[]
  readonly open: boolean
  readonly selectedId: CrumbsInspectorTargetId | null
  readonly capture: CrumbsDevtoolsCapture | null
  readonly stale: boolean
  readonly capacityReached: boolean
}
export type CaptureResult = { readonly ok: true; readonly capture: CrumbsDevtoolsCapture } | { readonly ok: false; readonly code: "target-missing" | "target-mismatch" | "capture-failed" | "capture-invalidated" }
export type TargetLease = { update(options: CrumbsInspectorTargetOptions): void; release(): void }
