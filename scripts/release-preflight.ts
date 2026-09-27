import { execFileSync } from "node:child_process"
import { appendFileSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

type PublishTargetInput = Readonly<{
  version: string
  tag: string
  tagCommit: string
  headCommit: string
}>

type PublishTarget = Readonly<{
  version: string
  tag: string
  commit: string
  npmTag: string
}>

const validIdentifier = /^[0-9A-Za-z-]+$/
const validCommit = /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/i

function semverParts(version: string): { prerelease: string[] } {
  const withoutBuild = version.split("+")
  if (withoutBuild.length > 2) {
    throw new Error(`Expected a valid semantic version, received ${JSON.stringify(version)}.`)
  }

  const build = withoutBuild[1]
  if (build !== undefined && (!build || !build.split(".").every((id) => validIdentifier.test(id)))) {
    throw new Error(`Expected a valid semantic version, received ${JSON.stringify(version)}.`)
  }

  const versionWithoutBuild = withoutBuild[0]
  if (versionWithoutBuild === undefined) {
    throw new Error(`Expected a valid semantic version, received ${JSON.stringify(version)}.`)
  }
  const hyphen = versionWithoutBuild.indexOf("-")
  const core = hyphen === -1 ? versionWithoutBuild : versionWithoutBuild.slice(0, hyphen)
  const prereleaseValue = hyphen === -1 ? undefined : versionWithoutBuild.slice(hyphen + 1)
  const coreParts = core.split(".")

  if (
    coreParts.length !== 3 ||
    coreParts.some((part) => !/^(0|[1-9]\d*)$/.test(part))
  ) {
    throw new Error(`Expected a valid semantic version, received ${JSON.stringify(version)}.`)
  }

  if (prereleaseValue === undefined) return { prerelease: [] }
  const prerelease = prereleaseValue.split(".")
  if (
    prerelease.some((id) =>
      !validIdentifier.test(id) || (/^\d+$/.test(id) && id.length > 1 && id.startsWith("0")),
    )
  ) {
    throw new Error(`Expected a valid semantic version, received ${JSON.stringify(version)}.`)
  }

  return { prerelease }
}

export function npmDistTagForVersion(version: string): string {
  const { prerelease } = semverParts(version)
  if (prerelease.length === 0) return "latest"

  const channel = prerelease[0]
  if (channel === undefined) {
    throw new Error(`Expected a valid semantic version, received ${JSON.stringify(version)}.`)
  }
  if (
    /^\d+$/.test(channel) ||
    channel.toLowerCase() === "latest" ||
    !/^[a-z][a-z0-9-]*$/i.test(channel)
  ) {
    throw new Error(
      `The prerelease channel ${JSON.stringify(channel)} cannot be used as an npm dist-tag. Use a named channel such as alpha, beta, or rc.`,
    )
  }

  return channel.toLowerCase()
}

export function validatePublishTarget({
  version,
  tag,
  tagCommit,
  headCommit,
}: PublishTargetInput): PublishTarget {
  const npmTag = npmDistTagForVersion(version)
  const expectedTag = `v${version}`

  if (tag !== expectedTag) {
    throw new Error(`Release tag ${JSON.stringify(tag)} must match ${expectedTag}.`)
  }
  if (!validCommit.test(tagCommit) || !validCommit.test(headCommit)) {
    throw new Error("The release tag and checked-out revision must resolve to Git commit IDs.")
  }
  if (tagCommit.toLowerCase() !== headCommit.toLowerCase()) {
    throw new Error(`Release tag ${tag} does not point at the checked-out commit.`)
  }

  return {
    version,
    tag,
    commit: headCommit.toLowerCase(),
    npmTag,
  }
}

function releaseOptionsFromArgs(args: string[]): { tag: string; githubOutput?: string } {
  const tagIndex = args.indexOf("--tag")
  const outputIndex = args.indexOf("--github-output")
  const tag = tagIndex === -1 ? undefined : args[tagIndex + 1]
  const githubOutput = outputIndex === -1 ? undefined : args[outputIndex + 1]
  const allowedIndexes = new Set([
    tagIndex,
    tagIndex + 1,
    ...(outputIndex === -1 ? [] : [outputIndex, outputIndex + 1]),
  ])
  if (
    tagIndex === -1 ||
    tagIndex !== args.lastIndexOf("--tag") ||
    tag === undefined ||
    tag.startsWith("--") ||
    (outputIndex !== -1 && (
      outputIndex !== args.lastIndexOf("--github-output") ||
      githubOutput === undefined ||
      githubOutput.startsWith("--")
    )) ||
    args.some((_, index) => !allowedIndexes.has(index))
  ) {
    throw new Error(
      "Usage: bun run release:preflight --tag v<package-version> [--github-output <path>]",
    )
  }

  return {
    tag,
    ...(githubOutput === undefined ? {} : { githubOutput }),
  }
}

function runPreflight(): void {
  const { tag, githubOutput } = releaseOptionsFromArgs(process.argv.slice(2))
  const packageJsonPath = resolve(import.meta.dir, "../packages/css/package.json")
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    name: string
    version: string
  }

  if (tag !== `v${packageJson.version}`) {
    throw new Error(`Release tag ${JSON.stringify(tag)} must match v${packageJson.version}.`)
  }

  const tagCommit = execFileSync(
    "git",
    ["rev-parse", "--verify", `refs/tags/${tag}^{commit}`],
    { encoding: "utf8" },
  ).trim()
  const headCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim()
  const target = validatePublishTarget({
    version: packageJson.version,
    tag,
    tagCommit,
    headCommit,
  })

  console.info(
    `Release preflight passed: ${packageJson.name}@${target.version} from ${target.tag} at ${target.commit}; npm dist-tag ${target.npmTag}.`,
  )

  if (githubOutput) {
    appendFileSync(
      githubOutput,
      `version=${target.version}\nnpm_tag=${target.npmTag}\nrelease_commit=${target.commit}\n`,
      "utf8",
    )
  }
}

if (import.meta.main) {
  try {
    runPreflight()
  } catch (error) {
    console.error(`Release preflight failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  }
}
