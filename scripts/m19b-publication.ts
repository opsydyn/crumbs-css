/** One authorised release exception. Normal release policy and published source remain unchanged. */
import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { join, relative, resolve, sep } from "node:path"
import { pathToFileURL } from "node:url"
import { isDeepStrictEqual } from "node:util"

export const approvedM19bException = Object.freeze({
  "id": "crumbs-m19b-warm-only-2026-10-10",
  "releaseTag": "v1.1.0",
  "sourceRevision": "f08a58d022f9237cf3f4aae8bc9bd77d5c75f204",
  "packageName": "@opsydyn/crumbs-css",
  "packageVersion": "1.1.0",
  "tarballSha256": "51b36b137a97364a30e401dc97f017890b6d3e09ad14d2319ad5cd03925baeda",
  "reportDigest": "54501f21a83671ec35e45ac35ad6087351cc70f8461ba30e8e873db8203be3b5",
  "sdk57ReceiptSha256": "74864ebab16194c64c39f15f785a99b32129565b025f1230475d71813369c4ba",
  "retainedQualificationRun": 38087033318,
  "metrics": [
    "warm-transform-ms"
  ],
  "warmMedianCeilingMs": 9.26974999999993,
  "approvedBy": "Alan Currie",
  "approvedOn": "2026-10-10",
  "approvalMessage": "Approve v1.1.0-only exception and publish (Recommended)",
  "scope": "Only the complete numerical warm-transform failure in this exact source/report/tarball binding. All other verification remains required; no baseline, generic policy or future-version exception changes."
})
const warmFailure = "Host-budget metric warm-transform-ms is fail; expected pass"
const sha256 = (bytes: string | Uint8Array): string => createHash("sha256").update(bytes).digest("hex")
const readJson = (path: string): any => JSON.parse(readFileSync(path, "utf8"))

export function assertM19bReleaseContext(value: unknown): void {
  if (typeof value !== "object" || value === null) throw Error("Missing m19b release context")
  for (const key of ["releaseTag", "sourceRevision", "packageName", "packageVersion", "tarballSha256", "reportDigest"] as const) {
    if ((value as Record<string, unknown>)[key] !== approvedM19bException[key]) throw Error(`Release exception does not cover ${key}`)
  }
}
export function assertM19bBudgetAdmission(
  result: { valid: boolean; blockers: readonly string[] },
  bundle: boolean,
  warmMedian?: number,
): "normal-pass" | "approved-warm-exception" {
  if (result.valid === true && isDeepStrictEqual(result.blockers, [])) return "normal-pass"
  const expected = bundle ? `Host-budget report is not release-qualified: ${warmFailure}` : warmFailure
  if (result.valid === false && isDeepStrictEqual(result.blockers, [expected]) &&
      typeof warmMedian === "number" && Number.isFinite(warmMedian) && warmMedian > 0 &&
      warmMedian <= approvedM19bException.warmMedianCeilingMs) return "approved-warm-exception"
  throw Error(`M1.9b publication blocked: ${result.blockers.join("; ") || "Verifier did not admit the report"}`)
}
export function assertM19bSdkReceipt(bytes: Uint8Array): void {
  if (sha256(bytes) !== approvedM19bException.sdk57ReceiptSha256) throw Error("Exact SDK57 qualification receipt differs")
  const value = JSON.parse(Buffer.from(bytes).toString("utf8"))
  if (!isDeepStrictEqual(value.source, {revision:approvedM19bException.sourceRevision,dirty:false}) ||
      value.crumbs?.version !== approvedM19bException.packageVersion ||
      value.crumbs?.tarballSha256 !== approvedM19bException.tarballSha256 ||
      value.crumbs?.files?.length !== 185 || value.contractPassed !== true || value.sdkSupported !== true ||
      !isDeepStrictEqual(value.checks,{npmResolution:"passed",installedBytes:"passed",types:"passed",motion:"passed",exports:"passed",runtimeGraph:"passed"})) throw Error("SDK57 qualification does not cover this release")
}
export function assertM19bExceptionReceipt(value: unknown, manifestSha256: string, toolingRevision: string, toolingSha256: string): void {
  if (!/^[a-f0-9]{64}$/u.test(manifestSha256) || !/^[a-f0-9]{40}$/u.test(toolingRevision) || !/^[a-f0-9]{64}$/u.test(toolingSha256)) throw Error("Invalid trusted tooling or manifest identity")
  if (!isDeepStrictEqual(value, { format: "crumbs.m19b.publication-exception.v1", approval: approvedM19bException, manifestSha256, toolingRevision, toolingSha256 })) throw Error("m19b exception approval, manifest or trusted workflow tooling does not match")
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
export function assertCleanM19bSource(root: string): void {
  try { execFileSync("git",["diff","--quiet","HEAD","--",".",":(top,exclude)docs/**"],{cwd:root,stdio:"pipe"}) }
  catch { throw Error("Released m19b checkout contains changed tracked source") }
  const injected=execFileSync("git",["ls-files","--others","--exclude-standard","--","scripts","packages/css/src","packages/css/test","packages/css/bench","apps/storybook/src","apps/storybook/e2e"],{cwd:root,encoding:"utf8"}).trim()
  if(injected) throw Error("Released m19b checkout contains injected authoring source")
}
function requireReleasedCheckout(root: string): void {
  assertCleanM19bSource(root)
  for (const ref of ["HEAD", "v1.1.0^{}"]) {
    if (execFileSync("git", ["rev-parse", ref], { cwd: root, encoding: "utf8" }).trim() !== approvedM19bException.sourceRevision) throw Error(`Immutable m19b source mismatch: ${ref}`)
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
export async function createM19bBundle(root: string, reportSource: string, bundle: string, sdkReceiptSource: string): Promise<void> {
  requireReleasedCheckout(root)
  const m = await modules(root), tooling = trustedTooling()
  mkdirSync(bundle, { recursive: true })
  if (existsSync(join(bundle,"manifest.json")) || existsSync(join(bundle,"m19b-exception.json"))) throw Error("Refusing to replace sealed m19b qualification")
  const tarballName = "opsydyn-crumbs-css-1.1.0.tgz", tarball = join(bundle,tarballName)
  const packageRoot = join(root,"packages/css"), pkg = readJson(join(packageRoot,"package.json"))
  assertM19bReleaseContext({ ...approvedM19bException, packageName:pkg.name, packageVersion:pkg.version, tarballSha256:sha256(readFileSync(tarball)), reportDigest:sha256(JSON.stringify(inventory(reportSource))) })
  const reportDirectory = join(bundle,"host-report")
  if (existsSync(reportDirectory)) {
    if (!isDeepStrictEqual(inventory(reportSource),inventory(reportDirectory))) throw Error("Staged report differs from measured report")
  } else cpSync(reportSource,reportDirectory,{recursive:true,errorOnExist:true})
  const sdkBytes = readFileSync(sdkReceiptSource)
  assertM19bSdkReceipt(sdkBytes)
  writeFileSync(join(bundle,"sdk57-qualification.json"),sdkBytes,{flag:"wx"})
  const artifacts = m.report.collectReleaseHostBudgetArtifactInventory(root)
  const verified = m.report.verifyReleaseHostBudgetReport({reportDirectory,repositoryRoot:root,expectedRevision:approvedM19bException.sourceRevision,expectedArtifacts:artifacts})
  const warmMedian = readJson(join(reportDirectory,"comparison.json")).metrics?.find((row: any) => row.id === "warm-transform-ms")?.current?.median
  const admission = assertM19bBudgetAdmission({valid:verified.releasePolicyQualified,blockers:verified.blockers},false,warmMedian)
  const host = m.environment.collectReleaseHostEnvironment(root)
  const hostBlockers = m.environment.verifyReleaseHostEnvironment(host)
  if(hostBlockers.length) throw Error(hostBlockers.join("; "))
  const sourceDigest = m.identity.captureGuaranteesSourceIdentity(root).sha256
  if(sourceDigest !== verified.sourceDigest) throw Error("Verified report source digest differs from checkout")
  const reportFiles = inventory(reportDirectory)
  const decoded = m.manifest.releaseQualificationManifestCodec.decode({
    formatVersion:2,policy:verified.policy,releaseTag:approvedM19bException.releaseTag,sourceRevision:approvedM19bException.sourceRevision,
    sourceDigest,host,reportDirectory:"host-report",reportFiles,reportDigest:sha256(JSON.stringify(reportFiles)),
    packageName:pkg.name,packageVersion:pkg.version,packageArtifacts:artifacts,tarballName,tarballSha256:approvedM19bException.tarballSha256,
  })
  if(!decoded.ok) throw Error(`Invalid qualification manifest: ${JSON.stringify(decoded.issues)}`)
  const manifestBytes = JSON.stringify(decoded.value,null,2)+"\n"
  const receipt = {format:"crumbs.m19b.publication-exception.v1",approval:approvedM19bException,manifestSha256:sha256(manifestBytes),...tooling}
  assertM19bExceptionReceipt(receipt,sha256(manifestBytes),tooling.toolingRevision,tooling.toolingSha256)
  writeFileSync(join(bundle,"manifest.json"),manifestBytes,{flag:"wx"})
  writeFileSync(join(bundle,"m19b-exception.json"),JSON.stringify(receipt,null,2)+"\n",{flag:"wx"})
  await verifyM19bBundle(root,bundle)
  console.log(`Sealed m19b qualification: ${admission}. Original report and releasePolicyQualified retained unchanged.`)
}
export async function verifyM19bBundle(root: string, bundle: string): Promise<void> {
  requireReleasedCheckout(root)
  const m = await modules(root), tooling = trustedTooling()
  const manifestBytes = readFileSync(join(bundle,"manifest.json"))
  const manifest = JSON.parse(manifestBytes.toString("utf8"))
  assertM19bReleaseContext(manifest)
  assertM19bSdkReceipt(readFileSync(join(bundle,"sdk57-qualification.json")))
  assertM19bExceptionReceipt(readJson(join(bundle,"m19b-exception.json")),sha256(manifestBytes),tooling.toolingRevision,tooling.toolingSha256)
  const result = m.artifact.verifyReleaseQualificationBundle({bundleDirectory:bundle,repositoryRoot:root,expectedTag:approvedM19bException.releaseTag,expectedRevision:approvedM19bException.sourceRevision})
  const warmMedian = readJson(join(bundle,manifest.reportDirectory,"comparison.json")).metrics?.find((row: any) => row.id === "warm-transform-ms")?.current?.median
  const admission = assertM19bBudgetAdmission(result,true,warmMedian)
  console.log(`Verified exact m19b tarball with ${admission}; all other released integrity and budget checks satisfied.`)
}
if(import.meta.main) {
  try {
    const [command,...args] = process.argv.slice(2)
    const allowed = command === "create" ? ["--repo","--report","--bundle","--sdk-receipt"] : command === "verify" ? ["--repo","--bundle"] : []
    const options: Record<string,string> = {}
    if(!allowed.length || args.length !== allowed.length*2) throw Error("Usage: m19b-publication.ts create|verify --repo <released-root> [--report <measured-report> --sdk-receipt <exact-receipt>] --bundle <bundle>")
    for(let i=0;i<args.length;i+=2) {
      const key=args[i]!,value=args[i+1]!
      if(!allowed.includes(key)||options[key]||!value||value.startsWith("--")) throw Error("Invalid or duplicate option")
      options[key]=value
    }
    if(allowed.some(k=>!options[k])) throw Error("Missing required option")
    const root=resolve(options["--repo"]!),bundle=resolve(options["--bundle"]!)
    if(command === "create") await createM19bBundle(root,resolve(options["--report"]!),bundle,resolve(options["--sdk-receipt"]!))
    else await verifyM19bBundle(root,bundle)
  } catch(error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode=1 }
}
