import {createRuntimeExtensionCapture} from './compiler/runtime-extension-capture'
import {RuntimeExtensionSymbol} from './extensions/model'
import {copyCompilerLocalData} from "./compiler/local-data"
import {localOperandCandidate,NativeVarAssignmentsType} from "./local-vars/model"
import {admitLocalOperand,admitVarAssignments} from "./local-vars/admission"
import {NativeStylesDiagnosticCode} from "./diagnostics"
import {NativeStylesCompatibilityError} from "./native-compatibility"
import {isNativeStyleMap, NativeRecipeClassSymbol, NativeStyleMapSymbol, NativeStyleMapType} from "./native-style-map"
import {NativeModuleMetadataExportName} from "./compiler/native-module-metadata"

export const ExportRecordType = "crumbs.css.export-record"
export const ExportStringType = "crumbs.css.export-string"
export const ExportUndefinedType = "crumbs.css.export-undefined"
export const ExportNegativeZeroType = "crumbs.css.export-negative-zero"
const reservedBindings = new Set("await break case catch class const continue debugger default delete do else enum export extends false finally for function if implements import in instanceof interface let new null package private protected public return static super switch this throw true try typeof var void while with yield eval arguments".split(" "))

// ADR D1/D2: capture kinds before upstream serialization can discard native data.
export function captureNativeExports(exports: Record<string, unknown>, filePath: string, styleHandles: ReadonlySet<string>, unusedCompositionRegex: RegExp | null): Record<string, unknown> {
  const extensions = createRuntimeExtensionCapture(filePath,styleHandles,unusedCompositionRegex)
  const active = new Set<object>()
  function reject(path: string, reason: string): never {
    throw new NativeStylesCompatibilityError(NativeStylesDiagnosticCode.UnsupportedExport,
      `Unsupported export in ${filePath} at ${path}: ${reason}. Export named finite primitives, dense arrays and plain data records; move runtime objects/functions to a regular TypeScript module.`)
  }
  function capture(value: unknown, path: string): unknown {
    if (value === undefined) return {$$type: ExportUndefinedType}
    if (typeof value === "string") return styleHandles.has(value)
      ? {$$type: "crumbs.css.class", className: unusedCompositionRegex === null ? value : value.replace(unusedCompositionRegex, "")} : {$$type: ExportStringType, value}
    if (typeof value === "number") {
      if (!Number.isFinite(value)) reject(path, "non-finite number")
      return Object.is(value, -0) ? {$$type: ExportNegativeZeroType} : value
    }
    if (value === null || typeof value === "boolean") return value
    if (typeof value === "function" && Object.getOwnPropertyDescriptor(value,RuntimeExtensionSymbol)) return extensions.capture(value,path)
    if (typeof value !== "object") reject(path, `unsupported ${typeof value}`)
    if (active.has(value)) reject(path, "cyclic data")
    const prototype = Object.getPrototypeOf(value)
    if (!Array.isArray(value) && prototype !== null && Object.getPrototypeOf(prototype) !== null) reject(path, "object instance or inherited data")
    if (Array.isArray(value) && (prototype === null || Object.getPrototypeOf(prototype) === null || Object.getPrototypeOf(Object.getPrototypeOf(prototype)) !== null)) reject(path, "array instance or custom prototype")
    const symbols = Object.getOwnPropertySymbols(value)
    if (symbols.some(symbol => symbol !== NativeStyleMapSymbol && symbol !== NativeRecipeClassSymbol)) reject(path, "symbol-keyed data")
    if (symbols.length > 1) reject(path, "conflicting internal markers")
    for (const symbol of symbols) {
      const descriptor = Object.getOwnPropertyDescriptor(value, symbol)!
      if (!("value" in descriptor) || descriptor.value !== true || !descriptor.enumerable) reject(path, "invalid internal marker")
    }
    const descriptors = Object.getOwnPropertyDescriptors(value)
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (!("value" in descriptor)) reject(`${path}.${key}`, "accessor data")
      if (!descriptor.enumerable && !(Array.isArray(value) && key === "length")) reject(`${path}.${key}`, "non-enumerable data")
    }
    if (Array.isArray(value) && (Object.keys(value).length !== value.length || Object.keys(value).some((key, index) => key !== String(index)))) reject(path, "sparse array or extra array fields")
    if (Object.getOwnPropertyDescriptor(value,"$$type")?.value === NativeVarAssignmentsType) return admitVarAssignments(copyCompilerLocalData(value))
    if (localOperandCandidate(value)) return admitLocalOperand(copyCompilerLocalData(value))
    active.add(value)
    try {
      if (Object.getOwnPropertyDescriptor(value, NativeRecipeClassSymbol)?.value === true) {
        if (descriptors.$$type?.value !== "crumbs.css.class" || typeof descriptors.className?.value !== "string" || Object.keys(descriptors).length !== 2) reject(path, "invalid internal class reference")
        return {$$type: "crumbs.css.class", className: unusedCompositionRegex === null ? descriptors.className.value : descriptors.className.value.replace(unusedCompositionRegex, "")}
      }
      if (Array.isArray(value)) return value.map((entry, index) => capture(entry, `${path}[${index}]`))
      const entries = Object.entries(descriptors).map(([key, descriptor]) => [key, capture(descriptor.value, `${path}.${key}`)])
      const record = {$$type: ExportRecordType, entries, nullPrototype: prototype === null}
      return isNativeStyleMap(value) ? {$$type: NativeStyleMapType, styles: record} : record
    } finally {active.delete(value)}
  }
  // esbuild emits getters for module exports; evaluate those bindings once here.
  const bindings = Object.keys(exports).map(name => [name,exports[name]] as const)
  const captured = new Map<string,unknown>()
  for (const [name,value] of [...bindings].sort(([a],[b])=>a<b?-1:a>b?1:0)) {
    if (reservedBindings.has(name) || !/^[A-Za-z_$][\w$]*$/.test(name)) reject(name, "only named ASCII binding identifiers are supported")
    if (name === NativeModuleMetadataExportName) reject(name, `"${NativeModuleMetadataExportName}" is reserved for generated native module metadata`)
    captured.set(name,capture(value,name))
  }
  return Object.fromEntries(bindings.map(([name])=>[name,captured.get(name)]))
}
