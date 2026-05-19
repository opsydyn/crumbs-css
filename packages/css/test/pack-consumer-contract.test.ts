import { describe, expect, it } from "bun:test"
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { dirname, resolve } from "node:path"

const PACKAGE_ROOT = resolve(import.meta.dir, "..")
const requireFromPackage = createRequire(resolve(PACKAGE_ROOT, "package.json"))

type SpawnResult = ReturnType<typeof Bun.spawnSync>

function run(
  command: ReadonlyArray<string>,
  cwd: string,
  env?: Record<string, string>,
): SpawnResult {
  const result = Bun.spawnSync([...command], {
    cwd,
    env: { ...process.env, ...env },
    stderr: "pipe",
    stdout: "pipe",
  })
  if (result.exitCode !== 0) {
    throw new Error(
      [`$ ${command.join(" ")}`, result.stdout.toString(), result.stderr.toString()].join("\n"),
    )
  }
  return result
}

function resolveInstalledPackageRoot(packageName: string): string {
  return dirname(requireFromPackage.resolve(`${packageName}/package.json`))
}

function linkRootDependency(consumerRoot: string, packageName: string): void {
  const source = resolveInstalledPackageRoot(packageName)
  if (!existsSync(source)) {
    throw new Error(`Missing root dependency required by consumer contract: ${packageName}`)
  }

  const target = resolve(consumerRoot, "node_modules", packageName)
  mkdirSync(dirname(target), { recursive: true })
  symlinkSync(source, target, "junction")
}

function createPackedConsumer(): string {
  const tempRoot = mkdtempSync(resolve(tmpdir(), "crumbs-css-pack-consumer-"))
  run(["bun", "pm", "pack", "--destination", tempRoot], PACKAGE_ROOT)
  const tarballName = readdirSync(tempRoot).find((entry) => entry.endsWith(".tgz"))
  if (tarballName === undefined) {
    throw new Error("bun pm pack did not create a tarball")
  }
  const tarball = resolve(tempRoot, tarballName)

  const packageRoot = resolve(tempRoot, "consumer", "node_modules", "@crumbs", "css")
  mkdirSync(packageRoot, { recursive: true })
  run(["tar", "-xzf", tarball, "--strip-components=1", "-C", packageRoot], tempRoot)

  for (const dependency of [
    "@types/react",
    "@vanilla-extract/css",
    "@vanilla-extract/integration",
    "css-to-react-native",
    "metro",
    "react",
    "react-native",
  ]) {
    linkRootDependency(resolve(tempRoot, "consumer"), dependency)
  }

  return resolve(tempRoot, "consumer")
}

const consumerTypeSource = `
  import { NativeStylesDiagnosticCode } from "@crumbs/css";
  import { createTheme, createThemeContract, type NativeRecipeProps, recipe } from "@crumbs/css/style";
  import { createRecipeResolver, resolveThemeTokens } from "@crumbs/css/theme";
  import { withNativeStyles } from "@crumbs/css/metro-plugin";
  import { transformCssTsToStyleSheet } from "@crumbs/css/dist/transformer";

  const vars = createThemeContract({
    color: {
      text: null,
    },
  });
  const activeTheme = createTheme(vars, {
    color: {
      text: "#ffffff",
    },
  });
  const button = recipe({
    defaultVariants: {
      tone: "primary",
    },
    variants: {
      tone: {
        primary: {
          backgroundColor: vars.color.text,
        },
      },
    },
  });
  type ButtonSelection = NativeRecipeProps<typeof button>;
  const selection: ButtonSelection = { tone: "primary" };

  resolveThemeTokens({ color: vars.color.text }, activeTheme);
  createRecipeResolver(button)(selection);
  withNativeStyles({} as never);
  void transformCssTsToStyleSheet;
  const diagnostic: NativeStylesDiagnosticCode = NativeStylesDiagnosticCode.UnsupportedSelector;
  void diagnostic;
`

function writeConsumerTsconfig(
  consumerRoot: string,
  filename: string,
  module: "ESNext" | "Node16",
  moduleResolution: "Bundler" | "Node16",
): void {
  writeFileSync(
    resolve(consumerRoot, filename),
    JSON.stringify(
      {
        compilerOptions: {
          exactOptionalPropertyTypes: true,
          module,
          moduleResolution,
          noEmit: true,
          noUncheckedIndexedAccess: true,
          skipLibCheck: true,
          strict: true,
          target: "ES2022",
        },
        include: ["consumer-types.ts"],
      },
      null,
      2,
    ),
  )
}

describe("@crumbs/css packed consumer contract", () => {
  it("ships only the compiled npm surface and can be consumed outside the monorepo", () => {
    const consumerRoot = createPackedConsumer()
    const packageRoot = resolve(consumerRoot, "node_modules", "@crumbs", "css")

    expect(existsSync(resolve(packageRoot, "dist", "index.mjs"))).toBe(true)
    expect(existsSync(resolve(packageRoot, "dist", "index.cjs"))).toBe(true)
    expect(existsSync(resolve(packageRoot, "dist", "index.d.mts"))).toBe(true)
    expect(existsSync(resolve(packageRoot, "dist", "index.d.cts"))).toBe(true)
    expect(existsSync(resolve(packageRoot, "dist", "transformer.cjs"))).toBe(true)
    expect(existsSync(resolve(packageRoot, "LICENSE"))).toBe(true)
    expect(existsSync(resolve(packageRoot, "src"))).toBe(false)
    expect(existsSync(resolve(packageRoot, "test"))).toBe(false)
    expect(existsSync(resolve(packageRoot, "fixtures"))).toBe(false)

    const packedPackageJson = JSON.parse(
      readFileSync(resolve(packageRoot, "package.json"), "utf8"),
    ) as {
      readonly private?: boolean
    }
    expect(packedPackageJson.private).not.toBe(true)

    writeFileSync(
      resolve(consumerRoot, "package.json"),
      JSON.stringify({ private: true, type: "module" }, null, 2),
    )

    writeFileSync(
      resolve(consumerRoot, "runtime.cjs"),
      `
        const root = require("@crumbs/css");
        const style = require("@crumbs/css/style");
        const theme = require("@crumbs/css/theme");
        const metro = require("@crumbs/css/metro-plugin");
        const transformer = require("@crumbs/css/dist/transformer");

        if (typeof root.withNativeStyles !== "function") throw new Error("missing root withNativeStyles");
        if (typeof style.createThemeContract !== "function") throw new Error("missing style createThemeContract");
        if (typeof theme.createRecipeResolver !== "function") throw new Error("missing theme createRecipeResolver");
        if (typeof metro.withNativeStyles !== "function") throw new Error("missing metro-plugin withNativeStyles");
        if (typeof transformer.transformCssTsToStyleSheet !== "function") throw new Error("missing transformer");
      `,
    )
    run(["node", "runtime.cjs"], consumerRoot)

    writeFileSync(
      resolve(consumerRoot, "runtime.mjs"),
      `
        import { NativeStylesDiagnosticCode } from "@crumbs/css";
        import { createThemeContract } from "@crumbs/css/style";
        import { createRecipeResolver } from "@crumbs/css/theme";
        import { withNativeStyles } from "@crumbs/css/metro-plugin";
        import { transformCssTsToStyleSheet } from "@crumbs/css/dist/transformer";

        if (typeof NativeStylesDiagnosticCode.UnsupportedSelector !== "string") throw new Error("missing root diagnostic code");
        if (typeof createThemeContract !== "function") throw new Error("missing style createThemeContract");
        if (typeof createRecipeResolver !== "function") throw new Error("missing theme createRecipeResolver");
        if (typeof withNativeStyles !== "function") throw new Error("missing metro-plugin withNativeStyles");
        if (typeof transformCssTsToStyleSheet !== "function") throw new Error("missing transformer");
      `,
    )
    run(["node", "runtime.mjs"], consumerRoot)

    writeFileSync(resolve(consumerRoot, "consumer-types.ts"), consumerTypeSource)
    writeConsumerTsconfig(consumerRoot, "tsconfig.node16.json", "Node16", "Node16")
    writeConsumerTsconfig(consumerRoot, "tsconfig.bundler.json", "ESNext", "Bundler")
    run([resolve(resolveInstalledPackageRoot("typescript"), "bin", "tsc"), "-p", "tsconfig.node16.json"], consumerRoot)
    run([resolve(resolveInstalledPackageRoot("typescript"), "bin", "tsc"), "-p", "tsconfig.bundler.json"], consumerRoot)
  })
})
