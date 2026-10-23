# M10.5 compiler-reuse decision evidence

Date2026-10-18; base `ed35a85`. **Retain shipping fresh compilation; park reuse as release remediation.** No compiler candidate or new performance measurement ran. See the [decision](../../assessments/2026-10-18-m10-5-compiler-reuse-decision.md) for alternatives, consequences and revisit conditions.

`source-observations.json` retains line-numbered excerpts and whole-file SHA-256s for current compilation, VM evaluation, resolution hints, registry behavior and the installed integration/esbuild interfaces. `inputs.json` pins the retained reports and active release policy/registry used for the decision. These are source/API observations and archived measurements, not evidence that a new reuse mechanism works.

`checks.json` retains three actual command results. The latest attribution verifier with self-tests/live preservation passes, checking948 tracked product files and181 shipping artifacts. The historical retained-context archive verifier passes, retaining its105-run/6,690-pair performance rejection. These are evidence replays, not new workload collections.

The third command, the historical restore-fix verifier against this checkout, **fails** at its pinned transformer source hash. Its source manifest describes an older compiler. That failure is expected source drift, not a newly reproduced runtime defect. It is retained and not converted into a current-source pass.

To check the historical correction fairly, all14 pinned source blobs were recovered read-only from Git commit `be182d2ec6e1462b16688c588c36629c5f73d074` into an owned temporary shadow repository, preserving the original evidence-relative paths. Every blob matches the manifest SHA-256. The original unmodified verifier then passes: four stages, ten transform traces and fourteen sources. `historical-replay.json` records that command and scope. The manifest's reported base is `7ef934c`; the later commit contains the actual recorded post-change bytes. No candidate build, Metro process, dependency install or native target was used. The shadow tree is disposable and not a new qualification environment.

Reproduce the current checks from the repository root:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 docs/evidence/2026-10-17-m10-5-repeated-package-cost/verify.py --self-test --repository "$PWD"
python3 docs/evidence/2026-10-07-m10-5-compiler-session-requalification/verify.py
bun docs/evidence/2026-10-07-m10-5-fail-closed-metro-parity/verify.cjs
```

The third command is expected to reject current source drift. For historical replay, copy that evidence directory under `docs/evidence/` in an owned temporary root, then materialize only the14 `source-manifest.json` paths using `git show be182d2:<path>`. Verify each blob's SHA-256 before running the same unmodified verifier there. Do not check out the old revision over the working tree, patch the verifier or rewrite its source pins.

Run `python3 verify.py --repository <absolute-current-repository-root>` in this packet to verify its file inventory, current source excerpts, referenced evidence/policy hashes and the accurately recorded pass/fail boundaries. The packet requires the containing repository and its existing pinned inputs. It is not a standalone performance baseline or independent execution attestation.

The decision adds no cache policy, accepted parent ADR, runtime import, relaxed gate or release exception. Original cold/warm/incremental failures remain. Future compiler design, full current-source host/Metro/native/device qualification and publication were not performed. No registry or hosted status was refreshed. Physical acceptance remains deferred. Evidence includes local paths; no public push is part of this slice.
