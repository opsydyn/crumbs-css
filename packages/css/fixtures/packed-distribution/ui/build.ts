import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { transformCssTsToStyleSheet } from "@opsydyn/crumbs-css/dist/transformer"

const packageRoot = process.cwd()
const sourceRoot = join(packageRoot, "src")
const outputRoot = join(packageRoot, "dist")

function runTypeScriptBuild(): void {
  const result = Bun.spawnSync(
    [join(packageRoot, "node_modules/.bin/tsc"), "--project", "tsconfig.json"],
    { cwd: packageRoot, stdout: "pipe", stderr: "pipe" },
  )
  if (result.exitCode !== 0) {
    throw new Error(
      ["TypeScript component build failed", result.stdout.toString(), result.stderr.toString()].join("\n"),
    )
  }
}

async function pointComponentAtCompiledStyles(): Promise<void> {
  const componentFiles = [
    join(outputRoot, "ActionCard.js"),
    join(outputRoot, "ActionCard.d.ts"),
  ]
  for (const filename of componentFiles) {
    const source = await readFile(filename, "utf8")
    await writeFile(filename, source.replaceAll("./ActionCard.css", "./ActionCard.styles"))
  }

  await rename(
    join(outputRoot, "ActionCard.css.d.ts"),
    join(outputRoot, "ActionCard.styles.d.ts"),
  )
  await rm(join(outputRoot, "ActionCard.css.js"), { force: true })
}

async function main(): Promise<void> {
  await rm(outputRoot, { recursive: true, force: true })
  await mkdir(outputRoot, { recursive: true })
  runTypeScriptBuild()

  const sourcePath = join(sourceRoot, "ActionCard.css.ts")
  const nativeStyles = await transformCssTsToStyleSheet(sourcePath, packageRoot, {
    strictDiagnostics: true,
    useStyleSheet: true,
    platform: "ios",
  })
  const webStyles = await transformCssTsToStyleSheet(sourcePath, packageRoot, {
    strictDiagnostics: true,
    useStyleSheet: false,
    platform: "web",
  })
  await writeFile(join(outputRoot, "ActionCard.styles.native.js"), nativeStyles)
  await writeFile(join(outputRoot, "ActionCard.styles.web.js"), webStyles)
  await pointComponentAtCompiledStyles()
}

await main()
