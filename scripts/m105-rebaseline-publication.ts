/** Exact-artifact admission under the explicitly approved v1.2 compiler baseline. Historical reports stay unchanged. */
import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join, relative, resolve, sep } from "node:path"
import { pathToFileURL } from "node:url"
import { isDeepStrictEqual } from "node:util"

export const approvedRebaselineRelease = Object.freeze({
  "id": "crumbs-m105-v12-baseline-2026-10-18",
  "releaseTag": "v1.2.0",
  "sourceRevision": "5a13f913b17ae957172968144ec83c391caee337",
  "packageVersion": "1.2.0",
  "tarballSha256": "4bd7897aa5beb6383b158f4e214436ba5d0d659b6b0fc005142c945a10dda02e",
  "reportDigest": "22a99b9542d94242b46be612044687589e67a58a17bd09bafff112038e340094",
  "tarballIntegrity": "sha512-IzfLC5Xr2iPUE0PTwiVOuL2oHLpQ8qDJE6o+PVgTVMYRCKOoJGBeQ1koolAcX+f6hec1wL2xTfPAvWEEGP+xOA==",
  "packageName": "@opsydyn/crumbs-css",
  "sdkMatrixSha256": "6d1edeabd8b36bf0a44fe936153e7b6215a3e23baa50e87e30aa0ff07ffbe471",
  "retainedQualificationRun": 39020184159,
  "medians": {
    "cold-transform-ms": 84.664042,
    "warm-transform-ms": 12.346250000000055,
    "incremental-rebuild": 136.8814999999995
  },
  "policySha256": "213dee062c9b38d9007b4e99ba8b0fd4cc8cadd52dc1522476188a5acbb4714a",
  "registrySha256": "f2c9c98ff841c679e80af43e251020e7461e665e4c2ae1f07b34bef615d2fa68",
  "approvedBy": "Alan Currie",
  "approvedOn": "2026-10-18",
  "approvalMessage": "We’ve pushed this as hard as we could let’s downgrade the gate to our baseline and ship the next version to npm",
  "scope": "Adopt the recorded v1.2.0 compiler baseline with existing relative allowances. Publish only this exact retained source/report/tarball under the amended policy; preserve all original results and remaining verifiers."
})
const sha256 = (bytes: string | Uint8Array): string => createHash("sha256").update(bytes).digest("hex")
const readJson = (path: string): any => JSON.parse(readFileSync(path, "utf8"))

export function assertRebaselineContext(value: unknown): void {
  if (typeof value !== "object" || value === null) throw Error("Missing m105-rebaseline release context")
  for (const key of ["releaseTag", "sourceRevision", "packageName", "packageVersion", "tarballSha256", "reportDigest"] as const) {
    if ((value as Record<string, unknown>)[key] !== approvedRebaselineRelease[key]) throw Error(`Release admission does not cover ${key}`)
  }
}
export function assertRebaselineAdmission(
  result: { valid: boolean; blockers: readonly string[] }, bundle: boolean,
  medians: Record<string, number | undefined>,
): "approved-current-baseline" {
  const expected = Object.keys(approvedRebaselineRelease.medians).map(id =>
    `${bundle ? "Host-budget report is not release-qualified: " : ""}Host-budget metric ${id} is fail; expected pass`)
  if (result.valid !== false || !isDeepStrictEqual(result.blockers, expected))
    throw Error(`M10.5 publication blocked: ${result.blockers.join("; ") || "Historical verifier result changed"}`)
  for (const [id, value] of Object.entries(approvedRebaselineRelease.medians)) {
    if (!Object.is(medians[id], value)) throw Error(`Exact baseline median differs: ${id}`)
  }
  return "approved-current-baseline"
}
function recordedMedians(report: string): Record<string, number> {
  const comparison = readJson(join(report, "comparison.json"))
  return Object.fromEntries(Object.keys(approvedRebaselineRelease.medians).map(id => [id,
    comparison.metrics?.find((row: any) => row.id === id)?.current?.median]))
}
async function assertSdkMatrix(root: string, bundle: string): Promise<void> {
  if (sha256(readFileSync(join(bundle,"sdk-matrix.json"))) !== approvedRebaselineRelease.sdkMatrixSha256)
    throw Error("Exact SDK matrix differs")
  const { checkSdkReleaseMatrix } = await import(pathToFileURL(join(root,"scripts/release-sdk-matrix.ts")).href)
  checkSdkReleaseMatrix(bundle, {
    tarballSha256: approvedRebaselineRelease.tarballSha256,
    tarballIntegrity: approvedRebaselineRelease.tarballIntegrity,
    sourceRevision: approvedRebaselineRelease.sourceRevision,
    packageVersion: approvedRebaselineRelease.packageVersion,
  })
}
export function assertRebaselineReceipt(value: unknown, manifestSha256: string, toolingRevision: string, toolingSha256: string): void {
  if (!/^[a-f0-9]{64}$/u.test(manifestSha256) || !/^[a-f0-9]{40}$/u.test(toolingRevision) || !/^[a-f0-9]{64}$/u.test(toolingSha256)) throw Error("Invalid trusted tooling or manifest identity")
  if (!isDeepStrictEqual(value, { format: "crumbs.m105-rebaseline.publication-baseline.v1", approval: approvedRebaselineRelease, manifestSha256, toolingRevision, toolingSha256 })) throw Error("m105-rebaseline baseline approval, manifest or trusted workflow tooling does not match")
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
export function assertCleanReleasedSource(root: string): void {
  try { execFileSync("git",["diff","--quiet","HEAD","--",".",":(top,exclude)docs/**"],{cwd:root,stdio:"pipe"}) }
  catch { throw Error("Released m105-rebaseline checkout contains changed tracked source") }
  const injected=execFileSync("git",["ls-files","--others","--exclude-standard","--","scripts","packages/css/src","packages/css/test","packages/css/bench","apps/storybook/src","apps/storybook/e2e"],{cwd:root,encoding:"utf8"}).trim()
  if(injected) throw Error("Released m105-rebaseline checkout contains injected authoring source")
}
function requireReleasedCheckout(root: string): void {
  assertCleanReleasedSource(root)
  for (const ref of ["HEAD", "v1.2.0^{}"]) {
    if (execFileSync("git", ["rev-parse", ref], { cwd: root, encoding: "utf8" }).trim() !== approvedRebaselineRelease.sourceRevision) throw Error(`Immutable m105-rebaseline source mismatch: ${ref}`)
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
export async function createRebaselineBundle(root: string, reportSource: string, bundle: string, sdkMatrixDirectory: string): Promise<void> {
  requireReleasedCheckout(root)
  const m = await modules(root), tooling = trustedTooling()
  mkdirSync(bundle, { recursive: true })
  if (existsSync(join(bundle,"manifest.json")) || existsSync(join(bundle,"rebaseline-admission.json"))) throw Error("Refusing to replace sealed m105-rebaseline qualification")
  const tarballName = "opsydyn-crumbs-css-1.2.0.tgz", tarball = join(bundle,tarballName)
  const packageRoot = join(root,"packages/css"), pkg = readJson(join(packageRoot,"package.json"))
  assertRebaselineContext({ ...approvedRebaselineRelease, packageName:pkg.name, packageVersion:pkg.version, tarballSha256:sha256(readFileSync(tarball)), reportDigest:sha256(JSON.stringify(inventory(reportSource))) })
  const reportDirectory = join(bundle,"host-report")
  if (existsSync(reportDirectory)) {
    if (!isDeepStrictEqual(inventory(reportSource),inventory(reportDirectory))) throw Error("Staged report differs from measured report")
  } else cpSync(reportSource,reportDirectory,{recursive:true,errorOnExist:true})
  for (const file of ["sdk-matrix.json", ...[56,57,58].map(sdk => `sdk-${sdk}-qualification.json`)]) {
    writeFileSync(join(bundle,file),readFileSync(join(sdkMatrixDirectory,file)),{flag:"wx"})
  }
  await assertSdkMatrix(root,bundle)
  const artifacts = m.report.collectReleaseHostBudgetArtifactInventory(root)
  const verified = m.report.verifyReleaseHostBudgetReport({reportDirectory,repositoryRoot:root,expectedRevision:approvedRebaselineRelease.sourceRevision,expectedArtifacts:artifacts})
  const admission = assertRebaselineAdmission({valid:verified.releasePolicyQualified,blockers:verified.blockers},false,recordedMedians(reportDirectory))
  const host = m.environment.collectReleaseHostEnvironment(root)
  const hostBlockers = m.environment.verifyReleaseHostEnvironment(host)
  if(hostBlockers.length) throw Error(hostBlockers.join("; "))
  const sourceDigest = m.identity.captureGuaranteesSourceIdentity(root).sha256
  if(sourceDigest !== verified.sourceDigest) throw Error("Verified report source digest differs from checkout")
  const reportFiles = inventory(reportDirectory)
  const decoded = m.manifest.releaseQualificationManifestCodec.decode({
    formatVersion:2,policy:verified.policy,releaseTag:approvedRebaselineRelease.releaseTag,sourceRevision:approvedRebaselineRelease.sourceRevision,
    sourceDigest,host,reportDirectory:"host-report",reportFiles,reportDigest:sha256(JSON.stringify(reportFiles)),
    packageName:pkg.name,packageVersion:pkg.version,packageArtifacts:artifacts,tarballName,tarballSha256:approvedRebaselineRelease.tarballSha256,
  })
  if(!decoded.ok) throw Error(`Invalid qualification manifest: ${JSON.stringify(decoded.issues)}`)
  const manifestBytes = JSON.stringify(decoded.value,null,2)+"\n"
  const receipt = {format:"crumbs.m105-rebaseline.publication-baseline.v1",approval:approvedRebaselineRelease,manifestSha256:sha256(manifestBytes),...tooling}
  assertRebaselineReceipt(receipt,sha256(manifestBytes),tooling.toolingRevision,tooling.toolingSha256)
  writeFileSync(join(bundle,"manifest.json"),manifestBytes,{flag:"wx"})
  writeFileSync(join(bundle,"rebaseline-admission.json"),JSON.stringify(receipt,null,2)+"\n",{flag:"wx"})
  await verifyRebaselineBundle(root,bundle)
  console.log(`Sealed m105-rebaseline qualification: ${admission}. Original report and releasePolicyQualified retained unchanged.`)
}
export async function verifyRebaselineBundle(root: string, bundle: string): Promise<void> {
  requireReleasedCheckout(root)
  const m = await modules(root), tooling = trustedTooling()
  const manifestBytes = readFileSync(join(bundle,"manifest.json"))
  const manifest = JSON.parse(manifestBytes.toString("utf8"))
  assertRebaselineContext(manifest)
  await assertSdkMatrix(root,bundle)
  assertRebaselineReceipt(readJson(join(bundle,"rebaseline-admission.json")),sha256(manifestBytes),tooling.toolingRevision,tooling.toolingSha256)
  const result = m.artifact.verifyReleaseQualificationBundle({bundleDirectory:bundle,repositoryRoot:root,expectedTag:approvedRebaselineRelease.releaseTag,expectedRevision:approvedRebaselineRelease.sourceRevision})
  const admission = assertRebaselineAdmission(result,true,recordedMedians(join(bundle,manifest.reportDirectory)))
  console.log(`Verified exact m105-rebaseline tarball with ${admission}; all other released integrity and budget checks satisfied.`)
}
if(import.meta.main) {
  try {
    const [command,...args] = process.argv.slice(2)
    const allowed = command === "create" ? ["--repo","--report","--bundle","--sdk-matrix"] : command === "verify" ? ["--repo","--bundle"] : []
    const options: Record<string,string> = {}
    if(!allowed.length || args.length !== allowed.length*2) throw Error("Usage: m105-rebaseline-publication.ts create|verify --repo <released-root> [--report <measured-report> --sdk-matrix <matrix-directory>] --bundle <bundle>")
    for(let i=0;i<args.length;i+=2) {
      const key=args[i]!,value=args[i+1]!
      if(!allowed.includes(key)||options[key]||!value||value.startsWith("--")) throw Error("Invalid or duplicate option")
      options[key]=value
    }
    if(allowed.some(k=>!options[k])) throw Error("Missing required option")
    const root=resolve(options["--repo"]!),bundle=resolve(options["--bundle"]!)
    if(command === "create") await createRebaselineBundle(root,resolve(options["--report"]!),bundle,resolve(options["--sdk-matrix"]!))
    else await verifyRebaselineBundle(root,bundle)
  } catch(error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode=1 }
}
