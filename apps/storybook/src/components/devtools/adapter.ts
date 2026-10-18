import type { ComponentType, ReactNode } from "react"
import type { InspectorProbeProps } from "./probes"
type HostProps = { children: ReactNode }
const dev: typeof import("./probes") | null = __DEV__ ? require("./probes") : null
export const InspectorHost: ComponentType<HostProps> = dev?.InspectorHost ?? (({ children }) => children)
export const InspectorProbe: ComponentType<InspectorProbeProps> = dev?.InspectorProbe ?? (() => null)
export const ClipboardCheck: ComponentType = dev?.ClipboardCheck ?? (() => null)
