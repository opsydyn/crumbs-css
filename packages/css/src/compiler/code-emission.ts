import {NativeLocalStylePlanType,localOperandCandidate,NativeVarAssignmentsType,type AnyLocalVar,type NativeLocalStylePlan} from "../local-vars/model"
import {createLocalVarsMetadata} from "./local-vars-metadata"
import { ExportNegativeZeroType, ExportRecordType, ExportStringType, ExportUndefinedType } from "../export-values"
import { NativeStyleMapType } from "../native-style-map"
import { emitNativeModuleMetadata, NativeModuleMetadataExportName } from "./native-module-metadata"
import { emitNativeStyleExplanationMetadata } from "./style-explanation-metadata"
import type { StyleExplanationMetadata } from "../devtools/style-explanation-model"
import { sortedOwnEnumerableDataEntries } from "./record-admission"

export type BuildStyleSheetCodeOptions = {
  readonly localDefinitions?:readonly AnyLocalVar[]
  readonly localPlans?: ReadonlyMap<string, NativeLocalStylePlan<unknown>>
  readonly useStyleSheet?: boolean
  readonly cacheIdentity?: string
  readonly includeStyleExplanations?: boolean
  readonly styleExplanationMetadata?: StyleExplanationMetadata
}

/**
 * Emits the final native module from already validated compiler outputs.
 * Inputs are ordered at this boundary so equivalent maps produce byte-stable
 * modules while encoded export records retain their authored semantic order.
 */
export function emitStyleSheetModule(
  exportMap: ReadonlyMap<string, unknown>,
  classStyles: ReadonlyMap<string, Record<string, unknown>>,
  depRelativePaths: ReadonlyArray<string> = [],
  options: BuildStyleSheetCodeOptions = {},
): string {
  if (exportMap.has(NativeModuleMetadataExportName)) {
    throw new TypeError(`Native module export "${NativeModuleMetadataExportName}" is reserved for generated metadata`)
  }
  if (exportMap.has("__crumbsDev")) {
    throw new TypeError('Native module export "__crumbsDev" is reserved for generated style explanation metadata')
  }
  if (options.includeStyleExplanations === true && options.styleExplanationMetadata === undefined) {
    throw new TypeError("Style explanation metadata must be supplied when includeStyleExplanations is enabled")
  }

  const localPlans=options.localPlans ?? new Map<string,NativeLocalStylePlan<unknown>>()
  const localMetadata=createLocalVarsMetadata(classStyles,exportMap,options.localDefinitions)
  if(localMetadata && exportMap.has("__crumbsLocalVars"))throw new TypeError('Native module export "__crumbsLocalVars" is reserved for local metadata')
  const useStyleSheet = options.useStyleSheet ?? true
  const createEntries = [...classStyles.entries()].filter(([name])=>!localPlans.has(name))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([cls, styles]) => `  ${JSON.stringify(cls)}: ${serializeRuntimeValue(styles)}`)
    .join(",\n")

  const exports = [...exportMap.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => serializeStyleExport(name, value, classStyles,localPlans))
    .join("\n")

  const depImports = [...new Set(depRelativePaths)]
    .sort((left, right) => left.localeCompare(right))
    .map((dependency) => `import ${JSON.stringify(dependency)};`)
    .join("\n")
  const cacheMarker = options.cacheIdentity === undefined
    ? ""
    : `/* @crumbs-native-cache ${options.cacheIdentity} */`

  const parts = [
    cacheMarker,
    useStyleSheet ? `import { StyleSheet } from "react-native";` : "",
    depImports,
    useStyleSheet
      ? `const _s = StyleSheet.create({\n${createEntries}\n});`
      : `const _s = {\n${createEntries}\n};`,
    emitNativeModuleMetadata(classStyles, exportMap),
    ...(options.includeStyleExplanations === true && options.styleExplanationMetadata !== undefined
      ? [emitNativeStyleExplanationMetadata(options.styleExplanationMetadata)]
      : []),
    ...(localMetadata ? [
      'function _crumbsFreeze(value) { if (value && typeof value === "object") { for (const key of Object.keys(value)) _crumbsFreeze(value[key]); Object.freeze(value); } return value; }',
      `const _l = _crumbsFreeze({${[...localPlans].sort(([a],[b])=>a.localeCompare(b)).map(([name,plan])=>`${JSON.stringify(name)}:${serializeRuntimeValue(plan)}`).join(",")}});`,
      `export const __crumbsLocalVars = _crumbsFreeze(${serializeRuntimeValue(localMetadata)});`,
    ] : []),
    exports,
  ].filter(Boolean)

  return parts.join("\n")
}

function serializeRuntimeValue(value: unknown): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Native style output contains a non-finite number")
    return Object.is(value, -0) ? "-0" : JSON.stringify(value)
  }
  if (typeof value === "string" || typeof value === "boolean" || value === null) return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(serializeRuntimeValue).join(",")}]`
  if (typeof value === "object" && value !== null) {
    const entries = sortedOwnEnumerableDataEntries(value, "native style output").map(([key, entry]) => {
      const property = key === "__proto__" ? `[${JSON.stringify(key)}]` : JSON.stringify(key)
      return `${property}:${serializeRuntimeValue(entry)}`
    })
    return `{${entries.join(",")}}`
  }
  throw new TypeError(`Native style output contains unsupported ${typeof value}`)
}

function serializeStyleExport(
  name: string,
  value: unknown,
  classStyles: ReadonlyMap<string, Record<string, unknown>>,
  localPlans:ReadonlyMap<string, NativeLocalStylePlan<unknown>>,
): string {
  if (typeof value === "string") {
    return classStyles.has(value)
      ? `export const ${name} = ${localPlans.has(value)?"_l":"_s"}[${JSON.stringify(value)}];`
      : `export const ${name} = undefined;`
  }

  return `export const ${name} = ${serializeExportValue(value, classStyles,localPlans)};`
}

function serializeExportValue(
  value: unknown,
  classStyles: ReadonlyMap<string, Record<string, unknown>>,
  localPlans:ReadonlyMap<string,NativeLocalStylePlan<unknown>>,
  freezeCurrent=true,
): string {
  if(isEncodedUnsupportedLocalPlacement(value,localPlans))throw new TypeError("Unsupported local variables in recipes, Sprinkles, conditions or expressions; resolve primitive local styles separately")
  if(localOperandCandidate(value)||isLocalAssignments(value))return `_crumbsFreeze(${serializeRuntimeValue(value)})`
  if (typeof value === "object" && value !== null && "$$type" in value) {
    if (value.$$type === ExportStringType && "value" in value) return JSON.stringify(value.value)
    if (value.$$type === ExportUndefinedType) return "undefined"
    if (value.$$type === ExportNegativeZeroType) return "-0"
    if (value.$$type === ExportRecordType && "entries" in value) {
      const entries = (value.entries as Array<[string, unknown]>).map(([key, entry]) =>
        `${key === "__proto__" ? `[${JSON.stringify(key)}]` : JSON.stringify(key)}: ${serializeExportValue(entry, classStyles,localPlans)}`,
      ).join(", ")
      const plainRecord = `{ ${entries} }`
      const record = "nullPrototype" in value && value.nullPrototype === true
        ? `Object.assign(Object.create(null), ${plainRecord})` : plainRecord
      return freezeCurrent && exportUsesLocal(value,classStyles,localPlans) ? `_crumbsFreeze(${record})` : record
    }
  }
  if (typeof value === "object" && value !== null && "$$type" in value && value.$$type === NativeStyleMapType && "styles" in value) {
    const marked=`Object.defineProperty(${serializeExportValue(value.styles, classStyles,localPlans,false)}, Symbol.for(${JSON.stringify(NativeStyleMapType)}), { value: true, enumerable: true })`
    return exportUsesLocal(value,classStyles,localPlans) ? `_crumbsFreeze(${marked})` : marked
  }
  if (isRecipeClassRef(value)) {
    return classStyles.has(value.className) ? `${localPlans.has(value.className)?"_l":"_s"}[${JSON.stringify(value.className)}]` : "undefined"
  }
  if (typeof value === "string") {
    return classStyles.has(value) ? `${localPlans.has(value)?"_l":"_s"}[${JSON.stringify(value)}]` : JSON.stringify(value)
  }
  if (typeof value === "number" || typeof value === "boolean" || value === null || value === undefined) {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    const array=`[${value.map(entry=>serializeExportValue(entry,classStyles,localPlans)).join(", ")}]`
    return exportUsesLocal(value,classStyles,localPlans)?`_crumbsFreeze(${array})`:array
  }
  if (typeof value === "object") {
    const entries = sortedOwnEnumerableDataEntries(value, "compiled export")
      .map(([key, entry]) => {
        const property = key === "__proto__" ? `[${JSON.stringify(key)}]` : JSON.stringify(key)
        return `${property}: ${serializeExportValue(entry, classStyles,localPlans)}`
      })
      .join(", ")
    return `{ ${entries} }`
  }

  return "undefined"
}

function isRecipeClassRef(value: unknown): value is { readonly className: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "$$type" in value &&
    value.$$type === "crumbs.css.class" &&
    "className" in value &&
    typeof value.className === "string"
  )
}

function exportUsesLocal(value:unknown,classes:ReadonlyMap<string,Record<string,unknown>>,plans:ReadonlyMap<string,NativeLocalStylePlan<unknown>>):boolean{
 if(localOperandCandidate(value))return true
 if(isRecipeClassRef(value))return plans.has(value.className)
 if(typeof value==="string")return plans.has(value)
 if(value&&typeof value==="object")return Object.values(value).some(item=>exportUsesLocal(item,classes,plans))
 return false
}

function isLocalAssignments(value:unknown):boolean{return !!value&&typeof value==="object"&&Object.getOwnPropertyDescriptor(value,"$$type")?.value===NativeVarAssignmentsType}
function isEncodedUnsupportedLocalPlacement(value:unknown,plans:ReadonlyMap<string,NativeLocalStylePlan<unknown>>):boolean{
 if(!value||typeof value!=="object"||!("$$type" in value)||value.$$type!==ExportRecordType||!("entries" in value))return false
 const entries=value.entries as readonly (readonly [string,unknown])[]
 const encodedTag=entries.find(([key])=>key==="$$type")?.[1]
 const tag=encodedTag&&typeof encodedTag==="object"&&"value" in encodedTag?encodedTag.value:undefined
 return typeof tag==="string"&&["crumbs.css.recipe","crumbs.css.component-recipe","crumbs.css.sprinkles-lookup-plan","crumbs.css.expression","crumbs.css.conditions"].includes(tag)&&exportUsesLocal(value,new Map(),plans)
}
