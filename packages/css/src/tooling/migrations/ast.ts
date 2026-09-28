import * as ts from "typescript"
import type { SourceMigrationDiagnostic, SourceMigrationDiagnosticCode } from "./model"

export type SourceEdit = {
  readonly start: number
  readonly end: number
  readonly replacement: string
  readonly code: SourceMigrationDiagnosticCode
}

export type ParsedMigrationSource = {
  readonly path: string
  readonly source: string
  readonly sourceFile: ts.SourceFile
  readonly diagnostics: ReadonlyArray<SourceMigrationDiagnostic>
}

export type SourceEditResult = {
  readonly edits: ReadonlyArray<SourceEdit>
  readonly diagnostics: ReadonlyArray<SourceMigrationDiagnostic>
}

/** Parse one explicitly supplied TypeScript source string; no project or file IO is performed. */
export function parseMigrationSource(path: string, source: string): ParsedMigrationSource {
  const extension = path.slice(path.lastIndexOf(".")).toLowerCase()
  if (extension !== ".ts" && extension !== ".tsx") {
    throw new TypeError("Source migrations accept only explicitly named .ts and .tsx files.")
  }
  const scriptKind = extension === ".tsx" ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, scriptKind)
  const parseDiagnostics = (sourceFile as ts.SourceFile & { readonly parseDiagnostics: ReadonlyArray<ts.Diagnostic> }).parseDiagnostics
  const diagnostics = parseDiagnostics.map(diagnostic => {
    const start = diagnostic.start ?? 0
    const location = sourceFile.getLineAndCharacterOfPosition(start)
    return {
      code: "source.parse-error" as const,
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
      path,
      line: location.line + 1,
      column: location.character + 1,
    }
  })
  return { path, source, sourceFile, diagnostics }
}

/** Apply checked, non-overlapping source spans from the end of the source toward the beginning. */
export function applySourceEdits(source: string, edits: ReadonlyArray<SourceEdit>): string {
  const ordered = [...edits].sort((left, right) => left.start - right.start || left.end - right.end)
  let previous: SourceEdit | undefined
  for (const edit of ordered) {
    if (!Number.isSafeInteger(edit.start) || !Number.isSafeInteger(edit.end) ||
      edit.start < 0 || edit.end < edit.start || edit.end > source.length) {
      throw new RangeError(`Source edit span [${edit.start}, ${edit.end}) is outside the source bounds.`)
    }
    if (previous !== undefined && (edit.start < previous.end || edit.start === previous.start)) {
      throw new RangeError(`Source edit spans [${previous.start}, ${previous.end}) and [${edit.start}, ${edit.end}) are overlapping.`)
    }
    previous = edit
  }

  let output = source
  for (const edit of [...ordered].reverse()) {
    output = `${output.slice(0, edit.start)}${edit.replacement}${output.slice(edit.end)}`
  }
  return output
}

/** Construct a stable path/line/column diagnostic at a source node. */
export function migrationDiagnosticAt(
  parsed: ParsedMigrationSource,
  node: ts.Node | undefined,
  code: SourceMigrationDiagnosticCode,
  message: string,
  entityId?: string,
): SourceMigrationDiagnostic {
  const start = node?.getStart(parsed.sourceFile) ?? 0
  const location = parsed.sourceFile.getLineAndCharacterOfPosition(start)
  return {
    code,
    message,
    path: parsed.path,
    line: location.line + 1,
    column: location.character + 1,
    ...(entityId === undefined ? {} : { entityId }),
  }
}
