# M9.5 Safe Source Migrations Assessment

**Disposition:** M9.5 is qualified for the checked-in explicit-fixture
migration contract, tooling-only package entry, repository checks, and available
packed iOS/web export matrix. Android and physical-device acceptance remain
not-run and parked.

## Delivered behavior

The source migration format binds token and component/slot replacements to
explicit baseline and current schema-v1 manifests. The pure planner recognizes
static token paths, manifest-origin recipe declarations and extensions, and a
bounded immutable consumer flow from `useThemedStyles` through
`createComponentRecipeResolver`. It preserves aliases and unrelated source
text. Unsupported, computed, shadowed, reassigned, or ambiguous flows produce
blocking diagnostics.

The local `migrate:source` command reads only the migration, manifests, and
source files explicitly supplied with repeated `--file` flags. Dry-run is the
default. `--write` applies planned edits only after every named file passes
preflight; any blocker suppresses all writes in that invocation. Replacements
are atomic per file. Reports retain SHA-256 digests, canonical ordering, and the
`explicit-files-only` analysis limit. The tooling-only
`@opsydyn/crumbs-css/tooling/migrations` subpath exposes plain data, decoders,
canonical report encoding, and the pure planner; Effect Schema and TypeScript
AST values stay private.

The optional TypeScript peer is `>=5.9 <7`. The packed distribution consumer
uses TypeScript 6.0.3, and the packed ESM and CommonJS contract invokes the
planner against that runtime. The original `<6` bound caused npm `ERESOLVE` in
the Expo distribution fixture even though the peer was optional. Widening the
range resolves that install failure, and runtime graph checks continue to keep
TypeScript outside ordinary React Native entrypoints.

## Qualification evidence

The fixed fixture set includes baseline/current manifests, one migration map,
one safe token-and-slot consumer, one blocked computed-slot consumer, and one
source file omitted from the successful explicit-file run. The canonical dry-run
proposes five edits and applies none. The write fixture applies all five, while
the omitted source remains byte-identical. A blocked two-file invocation
proposes nine edits, applies none, returns exit code 1, and preserves both source
files. The report and receipt are deterministic across repeated runs and contain
no machine paths or implicit timestamps. See the [dry-run report](../evidence/2026-09-28-m9-5-safe-migrations/dry-run-report-v1.json)
and [qualification receipt](../evidence/2026-09-28-m9-5-safe-migrations/qualification.json).

- `bun run check` passed: build and typecheck passed; CSS reported 1,118 tests
  and 44,999 expectations across 185 files; Storybook reported 1 test and 7
  expectations.
- `bun run docs:build` passed with 24 pages, including the [migration how-to](../src/content/docs/how-to/migrate-design-system-sources.mdx).
- `bun run migrations:qualify` regenerated the deterministic report and
  receipt. The fixture qualification tests compare repeated output and prove
  blocked writes preserve every explicitly supplied source.
- `bun scripts/playground-distribution.ts --m8-3-check` passed for 17 packed
  export targets and 33 runtime graphs. Packed consumer typechecking, iOS/web
  production exports, and the paired tree-shaking canary passed. Android was
  recorded as `not-run`.
- The focused migration, packed-export, consumer-contract, runtime-isolation,
  and packed-runtime-graph command passed with a 30-second per-test timeout:
  105 tests and 791 expectations across 13 files.
- `git diff --check` passed.

## Limits

The fixtures are synthetic and do not establish complete repository consumer
coverage. The planner handles only its documented static syntax and immutable
resolver flow; it does not perform arbitrary TypeScript control-flow analysis,
repository discovery, or semantic CSS migration. A clean report means only that
the caller-supplied files fit the recognized migration map.

The packed distribution run establishes the recorded package install,
entrypoint, TypeScript, typecheck, and iOS/web production-bundle behavior. It
does not establish native rendering, physical-device performance, accessibility,
release safety, publication, or deployment. No package was published or release
changed. Android and device acceptance remain not-run and parked.

## Result

The M9.5 migration API/CLI, fixture evidence, documentation, repository checks,
packed distribution check, and focused tooling/runtime gates passed. This closes
M9.5 only. The next roadmap item is M9.6: DTCG 2025.10 format and resolver
adapter. Android/device acceptance stays parked.
