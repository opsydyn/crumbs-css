# v1 CI portability follow-up

The first exact-head Linux CI run failed before release creation. Raw output is retained.
Two native-guard test fixtures assumed `/private/tmp`; seven graph/property/package
integration checks exceeded functional 5/15-second test limits; the synthetic sealed
report fixture accidentally captured the real unit-test host; Git PATH shims also
failed under the older CI Bun pin. The synthetic report mismatch was independently
reproduced RED with Bun 1.4.3, then all 18 admission/forgery controls passed GREEN.

Repairs use `os.tmpdir` with owned-root cleanup, explicitly synthetic retained host
metadata for this private fixture while retaining genuine emitted graph scans,
30/60-second limits only for the named integration tests, and Bun 1.4.2 in CI.
Assertions, property seeds/run counts, approved numerical budgets, release policy,
package dependencies and shipping artifact bytes are unchanged. This unit-test
fixture is not measured host evidence and cannot qualify the Linux machine for npm.

The full pinned local suite passes 1,829 CSS/33 Storybook tests and strict types.
Exact original dependency roots and unrelated primary files are restored. The
previous packed-host receipt retains its original source binding; all 185 shipped
package files remain byte-identical. A fresh exact-head Linux CI run is required.
The v1 tag has not been pushed and no GitHub or npm release has been created yet.
