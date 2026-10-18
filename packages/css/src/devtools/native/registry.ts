import type { StyleExplanationReport } from "../style-explanation-model"
import type { CaptureResult, CrumbsInspectorInput, CrumbsInspectorTargetId, CrumbsInspectorTargetOptions, InspectorSnapshot, TargetLease } from "./model"

/** A provider-local registry. Getters are retained only for admitted, mounted targets. */
export function createInspectorRegistry() {
  type Entry = { token: object; options: CrumbsInspectorTargetOptions; revision: number }
  const entries = new Map<CrumbsInspectorTargetId, Entry>()
  const listeners = new Set<() => void>()
  let revision = 0, epoch = 0
  let state: InspectorSnapshot = Object.freeze({ targets: [], open: false, selectedId: null, capture: null, stale: false, capacityReached: false })
  function emit(patch: Partial<InspectorSnapshot> = {}) {
    state = Object.freeze({ ...state, ...patch, targets: Object.freeze([...entries].map(([id, e]) => Object.freeze({ id, label: e.options.label, exportPath: Object.freeze([...e.options.exportPath]), revision: e.revision }))) })
    for (const listener of [...listeners]) listener()
  }
  function register(id: CrumbsInspectorTargetId, options: CrumbsInspectorTargetOptions): TargetLease | null {
    if (!entries.has(id) && entries.size >= 200) {
      if (!state.capacityReached) emit({ capacityReached: true })
      return null
    }
    const entry: Entry = { token: {}, options, revision: ++revision }
    entries.set(id, entry)
    emit(state.selectedId === id ? { stale: true } : {})
    return {
      update(next) {
        if (entries.get(id)?.token !== entry.token) return
        entry.options = next; entry.revision = ++revision
        emit(state.selectedId === id ? { stale: true } : {})
      },
      release() {
        if (entries.get(id)?.token !== entry.token) return
        entries.delete(id)
        // Do not clear overflow merely because an admitted sibling unmounted: rejected
        // probes may still be mounted. Keep a bounded warning until provider disposal.
        emit(state.selectedId === id ? { selectedId: null, capture: null, stale: false } : {})
      },
    }
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    register,
    open() { if (!state.open) emit({ open: true }) },
    close() { epoch++; emit({ open: false, selectedId: null, capture: null, stale: false }) },
    capture(id: CrumbsInspectorTargetId, explain: (input: CrumbsInspectorInput) => StyleExplanationReport): CaptureResult {
      const entry = entries.get(id)
      if (!state.open || !entry) return { ok: false, code: "target-missing" }
      const generation = ++epoch, version = entry.revision
      const valid = () => state.open && epoch === generation && entries.get(id) === entry && entry.revision === version
      emit({ selectedId: id, capture: null, stale: false })
      try {
        if (!valid()) return { ok: false, code: "capture-invalidated" }
        const input = entry.options.getInput()
        if (!valid()) return { ok: false, code: "capture-invalidated" }
        if (input.exportPath.length !== entry.options.exportPath.length || input.exportPath.some((segment, i) => segment !== entry.options.exportPath[i])) return { ok: false, code: "target-mismatch" }
        const report = explain(input)
        if (!valid()) return { ok: false, code: "capture-invalidated" }
        const capture = Object.freeze({ type: "crumbs.devtools.capture" as const, version: 1 as const, target: Object.freeze({ instanceId: id, label: entry.options.label }), revision: version, report })
        emit({ capture, stale: false })
        return { ok: true, capture }
      } catch { return { ok: false, code: valid() ? "capture-failed" : "capture-invalidated" } }
    },
    dispose() { epoch++; entries.clear(); emit({ open: false, selectedId: null, capture: null, stale: false, capacityReached: false }); listeners.clear() },
  }
}
export type InspectorRegistry = ReturnType<typeof createInspectorRegistry>
