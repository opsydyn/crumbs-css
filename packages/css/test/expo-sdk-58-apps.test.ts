import { describe, expect, it } from "bun:test";
import { readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname, join } from "node:path";
import ts from "typescript";
const repo = resolve(import.meta.dir, "../../..");
const json = (file: string) => JSON.parse(readFileSync(resolve(repo, file), "utf8"));

describe("SDK58 app integration boundary", () => {
  for (const app of ["playground", "storybook"]) {
    const root = resolve(repo, "apps", app);
    const appRequire = createRequire(resolve(root, "package.json"));
    it(`${app} resolves its qualified SDK58 renderer cohort while the library retains SDK56`, () => {
      const manifest = json(`apps/${app}/package.json`);
      for (const [name, version] of Object.entries({expo:"58.0.14",react:"19.3.1","react-dom":"19.3.1","react-native":"0.88.0","@expo/metro-runtime":"58.0.14"})) {
        expect(manifest.dependencies[name]).toBe(version);
        expect(appRequire(name + "/package.json").version).toBe(version);
      }
      expect(json("packages/css/package.json").devDependencies["react-native"]).toBe("0.85.3");
      const ownReact = realpathSync(appRequire.resolve("react"));
      for (const peer of ["react-native", "react-native-web", "react-dom"]) {
        const fromPeer = createRequire(appRequire.resolve(peer + "/package.json"));
        expect(realpathSync(fromPeer.resolve("react"))).toBe(ownReact);
      }
    });
    it(`${app} uses exports-aware RN88 types and keeps its runtime factory self-export`, () => {
      const config = json(`apps/${app}/tsconfig.json`);
      const parsed = ts.parseJsonConfigFileContent(config, ts.sys, root);
      const resolved = ts.resolveModuleName("react-native", resolve(repo, "packages/css/dist/theme.d.mts"), parsed.options, ts.sys);
      expect(resolved.resolvedModule?.resolvedFileName).toBe(join(dirname(appRequire.resolve("react-native/package.json")), "types_generated/index.d.ts"));
      const manifest = json(`apps/${app}/package.json`);
      if (app === "storybook") expect(manifest.exports["./runtime-extensions"].default).toBe("./src/components/runtime-extensions/runtime.tsx");
    });
    it(`${app} selects real Babel/Rust Expo profiles explicitly and rejects typos`, () => {
      const { getConfig } = appRequire("expo/config");
      const old = process.env.CRUMBS_METRO_WORKER;
      try {
        for (const [worker, want] of [[undefined,false],["babel",false],["rust",true]] as const) {
          if (worker === undefined) delete process.env.CRUMBS_METRO_WORKER; else process.env.CRUMBS_METRO_WORKER = worker;
          const config = getConfig(root, { skipSDKVersionRequirement: true }).exp;
          expect(Boolean(config.experiments?.noxcturnalTransformWorker)).toBe(want);
          expect(config.web?.output).toBe("single");
        }
        process.env.CRUMBS_METRO_WORKER = "rsut";
        expect(() => getConfig(root, { skipSDKVersionRequirement: true })).toThrow("CRUMBS_METRO_WORKER");
      } finally { if (old === undefined) delete process.env.CRUMBS_METRO_WORKER; else process.env.CRUMBS_METRO_WORKER = old; }
    });
  }
  it("Storybook uses SDK58-compatible gestures and animation native modules", () => {
    const deps = json("apps/storybook/package.json").dependencies;
    for (const [name, version] of Object.entries({"react-native-gesture-handler":"3.3.0","react-native-reanimated":"4.7.1","react-native-worklets":"0.13.0","react-native-safe-area-context":"5.10.1","@react-native-community/datetimepicker":"9.2.1","@react-native-community/slider":"5.2.1"})) expect(deps[name]).toBe(version);
  });
});

it.each(["playground", "storybook"])("%s preserves Expo's effective default Babel descriptor", (app) => {
  const root = resolve(repo, "apps", app);
  const appRequire = createRequire(resolve(root, "package.json"));
  const config = appRequire("expo/metro-config").getDefaultConfig(root);
  const transformer = appRequire(config.transformer.babelTransformerPath);
  expect(transformer.isDefaultConfig({ filename: resolve(root, "src/App.tsx"), options: { projectRoot: root, platform: "ios", dev: true, type: "module", customTransformOptions: { engine: "hermes" } } })).toBe(true);
});

it("Storybook requires Flow parsing only for the legacy datetime-picker dependency", () => {
  const root = resolve(repo, "apps/storybook");
  const appRequire = createRequire(resolve(root, "package.json"));
  const config = appRequire("expo/metro-config").getDefaultConfig(root);
  const transformer = appRequire(config.transformer.babelTransformerPath);
  const options = { projectRoot: root, platform: "ios", dev: true, type: "module", customTransformOptions: { engine: "hermes" } };
  const fromControls = createRequire(appRequire.resolve("@storybook/addon-ondevice-controls/package.json"));
  const fromUi = createRequire(fromControls.resolve("@storybook/react-native-ui/package.json"));
  const dependency = fromUi.resolve("react-native-modal-datetime-picker/src/Modal.js");
  expect(transformer.isDefaultConfig({ filename: dependency, options })).toBe(false);
  expect(transformer.isDefaultConfig({ filename: resolve(root, "src/components/ShowcaseCard.tsx"), options })).toBe(true);
});

it("Storybook's scoped Flow configuration supports Metro's filename-free cache-key lookup", () => {
  const root = resolve(repo, "apps/storybook");
  const appRequire = createRequire(resolve(root, "package.json"));
  const config = appRequire("expo/metro-config").getDefaultConfig(root);
  const transformer = appRequire(config.transformer.babelTransformerPath);
  expect(typeof transformer.getCacheKey({ projectRoot: root })).toBe("string");
});
