import { execFileSync } from "node:child_process"
import { lstatSync, readFileSync, realpathSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { decodeGuaranteesMatrix } from "./guarantees-matrix/model"
import { renderGuaranteesMatrix, generatedPageCheckIssues } from "./guarantees-matrix/render"
import { validateGuaranteesMatrix } from "./guarantees-matrix/validate"

const DEFAULT_REPOSITORY_ROOT = resolve(import.meta.dir, "..")
const MATRIX_PATH = "docs/guarantees/matrix.v1.json"
const PAGE_PATH = "docs/src/content/docs/reference/guarantees.mdx"

function readCurrentSourceRevision(repositoryRoot: string): string {
  try {
    // Commits confined to the docs/ tree must not invalidate the source they
    // record. Bind current evidence to the latest commit touching other paths.
    const revision = execFileSync("git", ["log", "-1", "--format=%H", "--", ".", ":(exclude)docs/**"], {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
    if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(revision)) throw new Error("Git returned no valid source revision.")
    return revision
  } catch {
    throw new TypeError("Cannot check or render guarantees without the latest Git source revision outside docs/.")
  }
}

function assertGeneratedPageDestination(repositoryRoot: string, pagePath: string): void {
  const repositoryRealPath = realpathSync(repositoryRoot)
  const expectedParent = resolve(repositoryRealPath, dirname(PAGE_PATH))
  const actualParent = realpathSync(dirname(pagePath))
  if (actualParent !== expectedParent) {
    throw new TypeError("Generated MDX parent directory must resolve to its repository path.")
  }

  try {
    const destination = lstatSync(pagePath)
    if (destination.isSymbolicLink()) throw new TypeError("Generated MDX output path must not be a symlink.")
    if (!destination.isFile()) throw new TypeError("Generated MDX output path must be a regular file.")
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return
    throw error
  }
}

function formatIssues(issues: ReadonlyArray<{ readonly code: string; readonly message: string; readonly path?: string }>): string {
  return issues.map(({ code, message, path }) => `${code}${path === undefined ? "" : ` at ${path}`}: ${message}`).join("\n")
}

/** Run the repository-local strict matrix check or deterministic MDX renderer. */
export function runGuaranteesMatrixCommand(command: string, repositoryRoot = DEFAULT_REPOSITORY_ROOT): string {
  if (command !== "check" && command !== "render") {
    throw new TypeError("Use `check` or `render`.")
  }

  const matrix = decodeGuaranteesMatrix(JSON.parse(readFileSync(resolve(repositoryRoot, MATRIX_PATH), "utf8")) as unknown)
  const currentSourceRevision = readCurrentSourceRevision(repositoryRoot)
  const validationIssues = validateGuaranteesMatrix(matrix, repositoryRoot, currentSourceRevision)
  if (validationIssues.length > 0) {
    throw new TypeError(`Invalid guarantees matrix:\n${formatIssues(validationIssues)}`)
  }

  const expectedPage = renderGuaranteesMatrix(matrix)
  const pagePath = resolve(repositoryRoot, PAGE_PATH)
  if (command === "render") {
    assertGeneratedPageDestination(repositoryRoot, pagePath)
    writeFileSync(pagePath, expectedPage, "utf8")
    return `Rendered ${PAGE_PATH}.`
  }

  assertGeneratedPageDestination(repositoryRoot, pagePath)
  const currentPage = readFileSync(pagePath, "utf8")
  const pageIssues = generatedPageCheckIssues(expectedPage, currentPage)
  if (pageIssues.length > 0) throw new TypeError(formatIssues(pageIssues))
  return `Guarantees matrix v${matrix.schemaVersion} is valid; generated reference is current.`
}

if (import.meta.main) {
  try {
    const output = runGuaranteesMatrixCommand(process.argv[2] ?? "")
    process.stdout.write(`${output}\n`)
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  }
}
