import { explainStyle } from "../explain-style"
import type { CrumbsDevtoolsCapture, CrumbsInspectorInput } from "./model"
export const explainInspectorInput = (input: CrumbsInspectorInput) => explainStyle(input)
export type PreparedInspectorCopy = { readonly ok: true; readonly text: string; readonly byteLength: number } | { readonly ok: false; readonly code: "redaction-failed" | "non-json" | "too-large" }
/** Safe JSON serialization: never call user accessors or toJSON. No Node/TextEncoder requirement. */
export function prepareInspectorCopy(capture: CrumbsDevtoolsCapture, redact?: (capture: CrumbsDevtoolsCapture) => unknown): PreparedInspectorCopy {
  let value: unknown = capture
  try { if (redact) value = redact(capture) } catch { return { ok: false, code: "redaction-failed" } }
  const chunks: string[] = [], ancestors = new Set<object>()
  let bytes = 0, nodes = 0
  const append = (text: string) => {
    for (const point of text) { const n = point.codePointAt(0)!; bytes += n < 0x80 ? 1 : n < 0x800 ? 2 : n < 0x10000 ? 3 : 4 }
    if (bytes > 262144) throw "too-large"
    chunks.push(text)
  }
  function visit(item: unknown, depth: number): void {
    if (++nodes > 100000 || depth > 100) throw "too-large"
    if (item === null || typeof item === "boolean") { append(String(item)); return }
    if (typeof item === "string") { if(item.length > 262144) throw "too-large"; append(JSON.stringify(item)); return }
    if (typeof item === "number" && Number.isFinite(item)) { append(JSON.stringify(item)); return }
    if (typeof item !== "object" || item === null || ancestors.has(item)) throw "non-json"
    const array = Array.isArray(item), proto = Object.getPrototypeOf(item)
    if (!array && proto !== Object.prototype && proto !== null) throw "non-json"
    const descriptors = Object.getOwnPropertyDescriptors(item)
    if (Reflect.ownKeys(item).some(key => typeof key === "symbol")) throw "non-json"
    ancestors.add(item)
    if (array) {
      const length = descriptors.length?.value as number
      if (Object.keys(descriptors).some(k => k !== "length" && (!/^(0|[1-9][0-9]*)$/.test(k) || Number(k) >= length))) throw "non-json"
      append("[")
      for (let i = 0; i < length; i++) { if(i) append(","); const d = descriptors[String(i)]; if(!d || !("value" in d)) throw "non-json"; visit(d.value, depth+1) }
      append("]")
    } else {
      append("{"); let first = true
      for (const key of Object.keys(descriptors)) {
        const d = descriptors[key]!
        if (!("value" in d) || !d.enumerable) throw "non-json"
        if (!first) append(","); first = false
        append(JSON.stringify(key)); append(":"); visit(d.value, depth+1)
      }
      append("}")
    }
    ancestors.delete(item)
  }
  try { visit(value,0); return { ok: true, text: chunks.join(""), byteLength: bytes } }
  catch (error) { return { ok:false, code: error === "too-large" ? "too-large" : "non-json" } }
}
