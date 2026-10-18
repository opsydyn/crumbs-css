# M10.5 worker-scoped compiled-text candidate — rejected

The approved single implementation slice stopped at its explicit Metro session/cache isolation gate. **No candidate code is adopted and no performance or release qualification is claimed.** Shipping source and rebuilt artifact bytes are restored to their pre-slice inventories.

## Decisive evidence

`metro-journeys.tar.gz` contains three actual Expo/Metro journeys. The final `metro-eligible/result.json` records correct rendered JavaScript values through dependency candidate creation and restore, followed by three full Metro restarts using the same app, wrapper bytes and disk store:

| Stage | Native calls in this process | Ordinary calls in this process | Disk entries |
| --- | ---: | ---: | ---: |
| Candidate initial | 1 | 6 | 15 |
| Candidate restore | 4 | 7 | 16 |
| Restart 0 | 1 | 6 | 23 |
| Restart 1 | 1 | 6 | 30 |
| Restart 2 | 1 | 6 | 37 |

Counts are cumulative within each process. Earlier control entries share this store. Every restart recompiled six ordinary modules and added seven keys. `supervisor-key.json` isolates the cause using installed Expo **58.0.14**: two calls differing only in `__crumbsNativeCacheSession.token` produce different supervising-transformer cache keys. Identical-config and no-session controls each produce identical keys. The probe exits 1 for this failed isolation invariant.

Expo's `withMetroSupervisingTransformWorker` wraps custom transformers. The supervisor exports its own `getCacheKey`, whose `remainingConfig` includes the private session field and is hashed into the global key. Stripping that field inside Crumbs' transform function happens too late. Inspecting vanilla Metro's call to the custom transformer key was insufficient. The implementation plan explicitly rejects ordinary cache invalidation or session-driven store growth; disabling Expo's supervisor, patching Metro, or changing the transport contract is outside this candidate.

## Limits and secondary findings

- No verified native receipt occurred in these packed journeys. The CJS authoring fixture was unsupported by the witness syntax policy; the first ESM fixture was rewritten by Expo to use package-based tsconfig extends, also unsupported. The final ESM fixture disabled Expo's TypeScript setup and its independently captured witness was eligible.
- Static inspection of the final packed CJS transformer explains its disabled memo admission: its local `require` binding collided with the generated `import.meta.url` shim, causing a caught initialization error. This separate candidate defect is retained, not fixed after the stop gate. It cannot explain the isolated global-key difference, which is computed by Expo before Crumbs transforms execute.
- The earliest CJS journey's `passed: true` means only its then-implemented value checks passed. It does **not** mean this candidate qualified. Later harnesses explicitly reject missing verified reuse and check restart keys. All three raw outcomes are retained.
- Development suite runs are not a final green candidate suite. The third run had 1,931 passes, one skip and one failure: the newly added truncated-receipt negative test overlapped that run. The corrected focused receipt suite passed 20 tests/99 assertions afterward. The candidate has remaining unrun cases; none are represented as passes.
- No SDK consumer matrix, iOS/Android software-native run, Node 22 floor qualification, or complete 21-measurement host run was performed for this candidate. No performance improvement is claimed. Other workloads were left running as requested; incidental durations are contended diagnostics.
- The evidence concerns a dirty development candidate from base `bf090d9e67195fc9d77067044030f025d161b822`, with independent fresh control `090c4fd`. This is not a clean exact-source/artifact release packet.

## Contents and replay

- `candidate-identity.json`: actual candidate source and dist hashes, owned paths, dirty state.
- `candidate.patch.gz` and `candidate-sources-artifacts.tar.gz`: all changed/new candidate files, complete compiler source directory and built distribution; never installed by the verifier.
- `development-logs.tar.gz` and its index: all 48 pre-stop development logs, including failed runs.
- `metro-journeys.tar.gz`: source fixtures/configs, stable wrappers, full bundle responses, transform traces and logs; dependency links and cache payloads are excluded. The recorded key inventories remain in each result JSON.
- `supervisor-key.cjs`, JSON and stderr: executed key-isolation probe and exact observed outcome.
- `preservation.json`, `restoration.json`: original inventory and restored shipping byte comparison.
- `execution-ledger.md`: inline decisions and costs.
- `verification.json`, `restored-checks.tar.gz`: restored-source validation results.

Run `python3 docs/evidence/2026-10-18-m10-5-worker-scoped-compiled-text/verify.py` from the repository, or pass a copied packet directory. It checks inventory/archive digests, the failed key invariant with stable controls, actual three-restart counts/keys, and restoration. Offline replay validates retained evidence; it does not rerun Metro or timing. `verify.py --self-test` also tests altered outcomes, missing raw evidence and corrupted artifacts.

Next **M10.5**: exact-artifact release disposition. Keep publication blocked by default; refresh the existing pins and present the unchanged remediation-versus-explicit-version-exception choices. Any alternative session transport requires a new concrete architecture decision; this result does not show that all compiled-text caching is impossible.
