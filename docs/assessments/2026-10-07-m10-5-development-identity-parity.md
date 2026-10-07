# M10.5 development metadata identity parity

- Date: 2026-10-07
- Roadmap: M10.5
- Status: correctness slice passed; full CSS package suite restored
- Constraints: preserve public APIs and approved host limits; physical-device work remains deferred

## Decision

Development style-explanation metadata now resolves a file-scope path against the transform's explicit project root. Vanilla Extract supplies this path relative to its root; resolving it from `process.cwd()` made package ownership and declaration identifiers depend on whether the transform ran in a fresh worker or an existing workspace process. Absolute source paths retain their existing behavior.

The regression runs the fresh transform from the package root and the in-process transform from the workspace root. Both now emit the same package owner and byte-identical output. The fix changes no public API, dependency, runtime behavior, performance budget, baseline or threshold.

## Verification

- Regression before the fix: the in-process metadata owner was `crumbs-css` instead of `@opsydyn/crumbs-css`, and the output hash differed from the fresh worker.
- Regression after the fix: fresh/in-process output hashes and byte counts match; the expected package owner is present.
- `bun run --cwd packages/css build`: passed.
- `bun run --cwd packages/css typecheck`: passed.
- `bun run --cwd packages/css test`: 1,502 passed, one exact Node 22.0.0 floor test skipped, zero failed; 115,620 expectations.
- `git diff --check`: passed.

No Metro study, performance comparison, Simulator, Android emulator or physical device was run. Existing host-budget outcomes and the rejection of retained esbuild-context reuse remain unchanged. M10.5 remains open.

## Next item

**M10.5 — select and validate a distinct API-preserving warm-transform optimization against current source, exact generated-output parity and the unchanged 6.514 ms ceiling.** Do not repeat the rejected esbuild-context comparison without a materially different candidate.
