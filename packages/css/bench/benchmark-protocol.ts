export type WarmTransformCwdMode = "fixture-root" | "package-root"

export function parseWarmTransformCwdMode(value: string | undefined): WarmTransformCwdMode {
  if (value === undefined) return "fixture-root"
  if (value === "fixture-root" || value === "package-root") return value
  throw Error('CRUMBS_BENCH_WARM_TRANSFORM_CWD must be "fixture-root" or "package-root"')
}

export function resolveWarmTransformCwd(mode: WarmTransformCwdMode, packageRoot: string, fixtureRoot: string): string {
  return mode === "package-root" ? packageRoot : fixtureRoot
}

export function verifyTransformOutputParity(
  coldOutputs: readonly { outputSha256: string }[],
  warmOutputSha256: string,
  sameWorkingDirectory: boolean,
): boolean {
  const matches = coldOutputs.every(sample => sample.outputSha256 === warmOutputSha256)
  if (sameWorkingDirectory && !matches) throw Error("Cold/warm transform output mismatch")
  return matches
}

export async function withWorkingDirectory<T>(directory: string, operation: () => Promise<T>): Promise<T> {
  const previousDirectory = process.cwd()
  process.chdir(directory)
  try {
    return await operation()
  } finally {
    process.chdir(previousDirectory)
  }
}
