export type RuntimeOutcome = Readonly<{
  kind: "value" | "error"
  graph: unknown
  error?: Readonly<{ className: string; name: string; message: string }>
  trace: readonly string[]
}>

function dataField(value: object, key: string): unknown {
  for (let cursor: object | null = value; cursor !== null; cursor = Object.getPrototypeOf(cursor)) {
    const descriptor = Object.getOwnPropertyDescriptor(cursor, key)
    if (descriptor !== undefined) return "value" in descriptor ? descriptor.value : "<accessor>"
  }
  return undefined
}

/** Differential snapshots preserve order/aliases and never evaluate output accessors. */
function snapshot(root: unknown): unknown {
  const objects = new Map<object, number>(), symbols = new Map<symbol, number>()
  const nodes: unknown[] = []
  function encode(value: unknown): unknown {
    if (value === null) return { type: "null" }
    switch (typeof value) {
      case "undefined": return { type: "undefined" }
      case "number": return { type: "number", value: Object.is(value, -0) ? "-0" : Number.isFinite(value) ? value : String(value) }
      case "bigint": return { type: "bigint", value: String(value) }
      case "string": case "boolean": return { type: typeof value, value }
      case "symbol": {
        let id = symbols.get(value)
        if (id === undefined) { id = symbols.size; symbols.set(value, id) }
        return { type: "symbol", id, key: Symbol.keyFor(value) ?? null, description: value.description ?? null }
      }
    }
    const object = value as object
    const previous = objects.get(object)
    if (previous !== undefined) return { ref: previous }
    const id = nodes.length
    objects.set(object, id); nodes.push(null)
    const prototype = Object.getPrototypeOf(object) as object | null
    const constructor = prototype === null ? undefined : dataField(prototype, "constructor")
    const prototypeName = prototype === null ? "null" : prototype === Object.prototype ? "Object.prototype" :
      prototype === Array.prototype ? "Array.prototype" : typeof constructor === "function" ? String(dataField(constructor, "name")) : "custom"
    const properties = Reflect.ownKeys(object).map(key => {
      const descriptor = Object.getOwnPropertyDescriptor(object, key)
      if (descriptor === undefined) return { key: encode(key), missing: true }
      return { key: encode(key), enumerable: descriptor.enumerable, configurable: descriptor.configurable,
        ...("value" in descriptor ? { kind: "data", writable: descriptor.writable, value: encode(descriptor.value) } :
          { kind: "accessor", get: descriptor.get !== undefined, set: descriptor.set !== undefined }) }
    })
    const entries = object instanceof Map ? [...Map.prototype.entries.call(object)].map(([key, entry]) => [encode(key), encode(entry)]) :
      object instanceof Set ? [...Set.prototype.values.call(object)].map(encode) : undefined
    nodes[id] = { id, type: typeof value, prototype: prototypeName, extensible: Object.isExtensible(object),
      properties, ...(entries === undefined ? {} : { entries }) }
    return { ref: id }
  }
  return { root: encode(root), nodes }
}

export function captureRuntimeOutcome(run: (trace: string[]) => unknown): RuntimeOutcome {
  const trace: string[] = []
  let value: unknown, error: RuntimeOutcome["error"]
  try { value = run(trace) }
  catch (thrown) {
    const object = thrown !== null && (typeof thrown === "object" || typeof thrown === "function") ? thrown as object : undefined
    const constructor = object === undefined ? undefined : dataField(object, "constructor")
    error = { className: typeof constructor === "function" ? String(dataField(constructor, "name")) : typeof thrown,
      name: object === undefined ? typeof thrown : String(dataField(object, "name")),
      message: object === undefined ? String(thrown) : String(dataField(object, "message")) }
  }
  let graph: unknown
  try { graph = snapshot(value) }
  catch (failure) { graph = { snapshotFailure: failure instanceof Error ? failure.message : String(failure) } }
  return { kind: error === undefined ? "value" : "error", graph,
    ...(error === undefined ? {} : { error }), trace: [...trace] }
}

export function compareRuntimeOutcomes(control: RuntimeOutcome, candidate: RuntimeOutcome): readonly string[] {
  const failures = (["kind", "graph", "error", "trace"] as const).filter(key =>
    JSON.stringify(control[key]) !== JSON.stringify(candidate[key])) as string[]
  if ([control.graph, candidate.graph].some(graph => graph !== null && typeof graph === "object" && "snapshotFailure" in graph)) {
    failures.push("snapshot failure")
  }
  return failures
}
