# M10.5 theme runtime pre-change profile

This is diagnostic CPU-profile evidence for the existing compatibility entrypoints. It is not a budget measurement, does not replace the retained host-budget reports, and does not identify a feature-level cause by itself.

## Checkout and artifacts

- Checkout: `bcbed12f4b45bcb2d2394a09e45a3d743909731b`
- Node: `v24.15.0`
- Bun: `1.4.2`
- Platform: macOS (`darwin`), `arm64`
- Build command: `bun run build` (tsdown `0.21.10`)
- ESM artifact: `packages/css/dist/theme.mjs`, 157,973 bytes, SHA-256 `87c325d87b98b7a22735c8693196bec65b7b56ff457cc2eb7df200304bd3db5a`
- CJS artifact: `packages/css/dist/theme.cjs`, 159,563 bytes, SHA-256 `fc504722134a1427d7a697b283a78c9c25d835a20f5fdb0a5f26b927d347fc64`

The retained M10.5 graph report names source revision `374e4c44ab8b883a2e93549a2b842d4f827147a1`, while this checkout includes later documentation commits. The rebuilt compatibility artifacts match the retained ESM and CJS artifact hashes exactly, so the sizes below refer to the same emitted bytes. The retained report remains the authoritative budget evidence.

## Diagnostic CPU profiles

Commands used:

```bash
node --cpu-prof --cpu-prof-dir=/tmp/crumbs-m10-5-theme-before-esm --input-type=module -e 'await import("./packages/css/dist/theme.mjs")'
node --cpu-prof --cpu-prof-dir=/tmp/crumbs-m10-5-theme-before-cjs -e 'require("./packages/css/dist/theme.cjs")'
```

Raw profiles remain in `/tmp`:

- ESM: `/tmp/crumbs-m10-5-theme-before-esm/CPU.20261001.212300.25165.0.001.cpuprofile`
- CJS: `/tmp/crumbs-m10-5-theme-before-cjs/CPU.20261001.212300.25166.0.001.cpuprofile`

Each profile contains five samples. The ESM profile records one anonymous Crumbs frame at `theme.mjs:1:1`, corresponding to the 157,973-byte bundled artifact; its other samples are Node loader/module frames. The CJS profile contains a `theme.cjs` script node but records no sampled hits in that node; its samples are Node internals and idle time, corresponding to the 159,563-byte artifact. Both imports completed successfully. The bundles are emitted as single files, and these short profiles do not expose per-feature module frames. No feature-level hotspot is inferred.

## Retained host-budget context

The retained report records current Node `v24.15.0` initialization medians of 3.259708 ms for ESM and 2.791708 ms for CJS. Their approved absolute ceilings remain 3.067 ms and 2.444 ms; both current-Node comparisons fail. Node `v22.0.0` floor medians remain passing in the retained comparison.

The six admitted zero-growth graph comparisons also remain failures in the retained report:

| Entry | Format | Current graph | Approved ceiling |
| --- | --- | ---: | ---: |
| `theme/core` | ESM | 64,700 B | 17,271 B |
| `theme/core` | CJS | 65,559 B | 17,641 B |
| `tokens` | ESM | 60,959 B | 56,013 B |
| `tokens` | CJS | 68,485 B | 63,308 B |
| `theme` compatibility entry | ESM | 157,973 B | 44,017 B |
| `theme` compatibility entry | CJS | 159,563 B | 44,764 B |

These values are context for the approved remediation. This summary changes no baseline, threshold, registry membership, workload identity, or budget result.
