import {isCapturedRuntimeExtension,isCapturedExtensionStyleRef} from './runtime-extension-model'
import { ownEnumerableDataEntries } from "./record-admission"

export type StyleExportOwnershipIndex = {
  readonly classNames: ReadonlyArray<string>
  readonly exportNameForClass: (className: string) => string | undefined
}

/**
 * Builds the class/export ownership lookup once. Export names and discovered
 * classes are sorted so diagnostics and CSS conversion do not depend on map
 * insertion order.
 */
export function indexStyleExportOwnership(
  exportMap: ReadonlyMap<string, unknown>,
): StyleExportOwnershipIndex {
  if (exportMap.has("__crumbsDev")) {
    throw new TypeError('Native module export "__crumbsDev" is reserved for generated style explanation metadata')
  }
  const exportNameByClass = new Map<string, string>()
  const classNames = new Set<string>()

  for (const [name, value] of [...exportMap.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    for (const className of collectClassNamesFromExportValue(value)) {
      classNames.add(className)
      if (!exportNameByClass.has(className)) exportNameByClass.set(className, name)
    }
  }

  const orderedClassNames = [...classNames].sort((left, right) => left.localeCompare(right))
  return {
    classNames: Object.freeze(orderedClassNames),
    exportNameForClass: (className) => exportNameByClass.get(className),
  }
}

function collectClassNamesFromExportValue(value: unknown): ReadonlyArray<string> {
  if (isCapturedRuntimeExtension(value)) return collectExtensionStyles(value.args)
  if (isRecipeClassRef(value)) return [value.className]
  if (typeof value === "string") return [value]
  if (Array.isArray(value)) return value.flatMap(collectClassNamesFromExportValue)
  if (typeof value === "object" && value !== null) {
    return ownEnumerableDataEntries(value, "compiled export").flatMap(([, entry]) => collectClassNamesFromExportValue(entry))
  }
  return []
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

function collectExtensionStyles(value:unknown):ReadonlyArray<string>{
 if(isCapturedExtensionStyleRef(value))return [value.className]
 if(Array.isArray(value))return value.flatMap(collectExtensionStyles)
 if(value && typeof value==="object")return Object.values(value).flatMap(collectExtensionStyles)
 return []
}
