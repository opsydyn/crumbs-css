import { incrementalProbe } from "./incremental.css"

// This entry is requested only by the Metro incremental-rebuild measurement.
globalThis.__crumbsIncrementalProbe = incrementalProbe

declare global {
  var __crumbsIncrementalProbe: unknown
}
