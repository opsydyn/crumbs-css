import { createContext, useContext, useId, useLayoutEffect, useRef, useState } from "react"
import type { ReactElement, ReactNode } from "react"
import { createInspectorRegistry } from "./registry"
import type { InspectorRegistry } from "./registry"
import type { CrumbsInspectorTargetId, CrumbsInspectorTargetOptions, TargetLease } from "./model"
const InspectorContext = createContext<InspectorRegistry | null>(null)
export function CrumbsDevtoolsProvider({ children }: { readonly children: ReactNode }): ReactElement {
  const [store] = useState(createInspectorRegistry)
  const generation = useRef(0)
  useLayoutEffect(() => {
    const current = ++generation.current
    return () => { queueMicrotask(() => { if (generation.current === current) store.dispose() }) }
  }, [store])
  return <InspectorContext.Provider value={store}>{children}</InspectorContext.Provider>
}
export function useInspectorRegistry(): InspectorRegistry {
  const registry = useContext(InspectorContext)
  if (!registry) throw new Error("CrumbsDevtoolsProvider is required before using the native inspector")
  return registry
}
export function useCrumbsInspectorTarget(options: CrumbsInspectorTargetOptions): CrumbsInspectorTargetId {
  const registry = useInspectorRegistry()
  const id = useId() as CrumbsInspectorTargetId
  const lease = useRef<TargetLease | null>(null)
  useLayoutEffect(() => () => { lease.current?.release(); lease.current = null }, [registry, id])
  useLayoutEffect(() => {
    if (lease.current) lease.current.update(options)
    else lease.current = registry.register(id, options)
  })
  return id
}
