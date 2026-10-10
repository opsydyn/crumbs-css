/** One authorised release exception. Normal release policy and published source remain unchanged. */
import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join, relative, resolve, sep } from "node:path"
import { pathToFileURL } from "node:url"
import { isDeepStrictEqual } from "node:util"

export const approvedV1Exception = Object.freeze({
  id: "crumbs-v1-warm-transform-2026-10-10",
  releaseTag: "v1.0.0",
  sourceRevision: "382768a45f429f4c039e7584cd7c31e4f8821fc0",
  packageName: "@opsydyn/crumbs-css",
  packageVersion: "1.0.0",
  tarballSha256: "89b14b8fb70f8c07931c180b81b3a45cc4e8452d31ea43a768c041c7fe297baf",
  metric: "warm-transform-ms",
  approvedBy: "Alan Currie",
  approvedOn: "2026-10-10",
  approvalMessage: "Approved",
  scope: "Only the complete numerical warm-transform failure for this exact release; all other verification remains required. No baseline or numerical budget changes. No future-release exception.",
})
const warmFailure = "Host-budget metric warm-transform-ms is fail; expected pass"
const sha256 = (bytes: string | Uint8Array): string => createHash("sha256").update(bytes).digest("hex")
const readJson = (path: string): any => JSON.parse(readFileSync(path, "utf8"))

export function assertV1ReleaseContext(value: unknown): void {
  if (typeof value !== "object" || value === null) throw Error("Missing v1 release context")
  for (const key of ["releaseTag", "sourceRevision", "packageName", "packageVersion", "tarballSha256"] as const) {
    if ((value as Record<string, unknown>)[key] !== approvedV1Exception[key]) throw Error(`Release exception does not cover ${key}`)
  }
}
export function assertV1BudgetAdmission(result: { valid: boolean; blockers: readonly string[] }, bundle: boolean): "normal-pass" | "approved-warm-exception" {
  if (result.valid === true && isDeepStrictEqual(result.blockers, [])) return "normal-pass"
  const expected = bundle ? `Host-budget report is not release-qualified: ${warmFailure}` : warmFailure
  if (result.valid === false && isDeepStrictEqual(result.blockers, [expected])) return "approved-warm-exception"
  throw Error(`v1 publication blocked: ${result.blockers.join("; ") || "Verifier did not admit the report"}`)
}
export function assertV1ExceptionReceipt(value: unknown, manifestSha256: string, toolingRevision: string, toolingSha256: string): void {
  if (!/^[a-f0-9]{64}$/u.test(manifestSha256) || !/^[a-f0-9]{40}$/u.test(toolingRevision) || !/^[a-f0-9]{64}$/u.test(toolingSha256)) throw Error("Invalid trusted tooling or manifest identity")
  if (!isDeepStrictEqual(value, { format: "crumbs.v1.publication-exception.v1", approval: approvedV1Exception, manifestSha256, toolingRevision, toolingSha256 })) throw Error("v1 exception approval, manifest or trusted workflow tooling does not match")
}
function inventory(root: string, directory = root): { path: string; sha256: string }[] {
  const files: { path: string; sha256: string }[] = []
  for (const name of readdirSync(directory).sort()) {
    const absolute = join(directory, name), stat = lstatSync(absolute)
    if (stat.isSymbolicLink()) throw Error(`Symlink not allowed in host report: ${absolute}`)
    if (stat.isDirectory()) files.push(...inventory(root, absolute))
    else if (stat.isFile()) files.push({ path: relative(root, absolute).split(sep).join("/"), sha256: sha256(readFileSync(absolute)) })
    else throw Error(`Unsupported host report file: ${absolute}`)
  }
  return files.sort((a,b) => a.path.localeCompare(b.path))
}
export function assertCleanV1Source(root: string): void {
  try { execFileSync("git",["diff","--quiet","HEAD","--",".",":(top,exclude)docs/**"],{cwd:root,stdio:"pipe"}) }
  catch { throw Error("Released v1 checkout contains changed tracked source") }
  const injected=execFileSync("git",["ls-files","--others","--exclude-standard","--","scripts","packages/css/src","packages/css/test","packages/css/bench","apps/storybook/src","apps/storybook/e2e"],{cwd:root,encoding:"utf8"}).trim()
  if(injected) throw Error("Released v1 checkout contains injected authoring source")
}
function requireReleasedCheckout(root: string): void {
  assertCleanV1Source(root)
  for (const ref of ["HEAD", "v1.0.0^{}"]) {
    if (execFileSync("git", ["rev-parse", ref], { cwd: root, encoding: "utf8" }).trim() !== approvedV1Exception.sourceRevision) throw Error(`Immutable v1 source mismatch: ${ref}`)
  }
}
async function modules(root: string) {
  const load = (file: string) => import(pathToFileURL(join(root, file)).href)
  const [artifact, report, environment, manifest, identity] = await Promise.all([
    load("scripts/release-qualification-artifact.ts"), load("scripts/release-host-budget-report.ts"),
    load("scripts/release-host-environment.ts"), load("packages/css/bench/release-qualification-manifest.ts"),
    load("scripts/guarantees-matrix/source-identity.ts"),
  ])
  return { artifact, report, environment, manifest, identity }
}
function trustedTooling() {
  const toolingRevision = process.env.GITHUB_SHA ?? ""
  if (!/^[a-f0-9]{40}$/u.test(toolingRevision)) throw Error("GITHUB_SHA must identify the dispatched main workflow commit")
  return { toolingRevision, toolingSha256: sha256(readFileSync(import.meta.path)) }
}
export async function createV1Bundle(root: string, reportSource: string, bundle: string): Promise<void> {
  requireReleasedCheckout(root)
  const m = await modules(root), tooling = trustedTooling()
  mkdirSync(bundle, { recursive: true })
  if (existsSync(join(bundle,"manifest.json")) || existsSync(join(bundle,"v1-exception.json"))) throw Error("Refusing to replace sealed v1 qualification")
  const tarballName = "opsydyn-crumbs-css-1.0.0.tgz", tarball = join(bundle,tarballName)
  const packageRoot = join(root,"packages/css"), pkg = readJson(join(packageRoot,"package.json"))
  assertV1ReleaseContext({ ...approvedV1Exception, packageName:pkg.name, packageVersion:pkg.version, tarballSha256:sha256(readFileSync(tarball)) })
  const reportDirectory = join(bundle,"host-report")
  if (existsSync(reportDirectory)) {
    if (!isDeepStrictEqual(inventory(reportSource),inventory(reportDirectory))) throw Error("Staged report differs from measured report")
  } else cpSync(reportSource,reportDirectory,{recursive:true,errorOnExist:true})
  const artifacts = m.report.collectReleaseHostBudgetArtifactInventory(root)
  const verified = m.report.verifyReleaseHostBudgetReport({reportDirectory,repositoryRoot:root,expectedRevision:approvedV1Exception.sourceRevision,expectedArtifacts:artifacts})
  const admission = assertV1BudgetAdmission({valid:verified.releasePolicyQualified,blockers:verified.blockers},false)
  const host = m.environment.collectReleaseHostEnvironment(root)
  const hostBlockers = m.environment.verifyReleaseHostEnvironment(host)
  if(hostBlockers.length) throw Error(hostBlockers.join("; "))
  const sourceDigest = m.identity.captureGuaranteesSourceIdentity(root).sha256
  if(sourceDigest !== verified.sourceDigest) throw Error("Verified report source digest differs from checkout")
  const reportFiles = inventory(reportDirectory)
  const decoded = m.manifest.releaseQualificationManifestCodec.decode({
    formatVersion:2,policy:verified.policy,releaseTag:approvedV1Exception.releaseTag,sourceRevision:approvedV1Exception.sourceRevision,
    sourceDigest,host,reportDirectory:"host-report",reportFiles,reportDigest:sha256(JSON.stringify(reportFiles)),
    packageName:pkg.name,packageVersion:pkg.version,packageArtifacts:artifacts,tarballName,tarballSha256:approvedV1Exception.tarballSha256,
  })
  if(!decoded.ok) throw Error(`Invalid qualification manifest: ${JSON.stringify(decoded.issues)}`)
  const manifestBytes = JSON.stringify(decoded.value,null,2)+"\n"
  const receipt = {format:"crumbs.v1.publication-exception.v1",approval:approvedV1Exception,manifestSha256:sha256(manifestBytes),...tooling}
  assertV1ExceptionReceipt(receipt,sha256(manifestBytes),tooling.toolingRevision,tooling.toolingSha256)
  writeFileSync(join(bundle,"manifest.json"),manifestBytes,{flag:"wx"})
  writeFileSync(join(bundle,"v1-exception.json"),JSON.stringify(receipt,null,2)+"\n",{flag:"wx"})
  await verifyV1Bundle(root,bundle)
  console.log(`Sealed v1 qualification: ${admission}. Original report and releasePolicyQualified retained unchanged.`)
}
export async function verifyV1Bundle(root: string, bundle: string): Promise<void> {
  requireReleasedCheckout(root)
  const m = await modules(root), tooling = trustedTooling()
  const manifestBytes = readFileSync(join(bundle,"manifest.json"))
  const manifest = JSON.parse(manifestBytes.toString("utf8"))
  assertV1ReleaseContext(manifest)
  assertV1ExceptionReceipt(readJson(join(bundle,"v1-exception.json")),sha256(manifestBytes),tooling.toolingRevision,tooling.toolingSha256)
  const result = m.artifact.verifyReleaseQualificationBundle({bundleDirectory:bundle,repositoryRoot:root,expectedTag:approvedV1Exception.releaseTag,expectedRevision:approvedV1Exception.sourceRevision})
  const admission = assertV1BudgetAdmission(result,true)
  console.log(`Verified exact v1 tarball with ${admission}; all other released integrity and budget checks satisfied.`)
}
if(import.meta.main) {
  try {
    const [command,...args] = process.argv.slice(2)
    const allowed = command === "create" ? ["--repo","--report","--bundle"] : command === "verify" ? ["--repo","--bundle"] : []
    const options: Record<string,string> = {}
    if(!allowed.length || args.length !== allowed.length*2) throw Error("Usage: v1-publication.ts create|verify --repo <released-root> [--report <measured-report>] --bundle <bundle>")
    for(let i=0;i<args.length;i+=2) {
      const key=args[i]!,value=args[i+1]!
      if(!allowed.includes(key)||options[key]||!value||value.startsWith("--")) throw Error("Invalid or duplicate option")
      options[key]=value
    }
    if(allowed.some(k=>!options[k])) throw Error("Missing required option")
    const root=resolve(options["--repo"]!),bundle=resolve(options["--bundle"]!)
    if(command === "create") await createV1Bundle(root,resolve(options["--report"]!),bundle)
    else await verifyV1Bundle(root,bundle)
  } catch(error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode=1 }
}
