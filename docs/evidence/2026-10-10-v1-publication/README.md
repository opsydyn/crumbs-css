# M10.5 v1 publication evidence

Current outcome: **GitHub v1.0.0 is published; npm publication is pending explicit approval of the fresh source-built tarball identity.** See [status](publication-status.json) and the concrete [revised release decision](revised-release-decision.md).

- [Original warm-only approval](approval.json) and [original decision](publication-decision.md) are retained unchanged. The [incremental amendment](incremental-approval.json) additionally admits the approved 0.174 ms numerical overrun, capped at the recorded median; the original exact artifact pin remains active. No numerical limit, baseline or generic policy change.
- [Complete report and fresh source-built tarball](run-38059803838-bundle/): all 21 matched rows, raw measurements, before/after source/artifact/policy identities and the actual new packed bytes.
- [Independent full-report verification](full-report-verification.json): nine blocking passes, warm and incremental failures, no incomplete evidence; eight advisory failures remain visible.
- [Artifact difference diagnostic](artifact-path-difference.json): 182/185 file bytes and all 105 JavaScript files identical; three declaration path/comment references differ. This is not artifact admission.
- [Workflow follow-up](workflow-follow-up.md): real missing-baseline-edge RED/GREEN reproduction and committed isolated setup fix.
- [Original exception rejection controls](final-exception-controls.log): historical five-test/33-assertion warm-only verification. [Incremental controls](incremental-exception-verification.json) record the updated numerical admission and unchanged artifact/integrity rejection boundaries.

The initial five-run cold/warm preflight remains a bounded diagnostic. The complete run above supplies the current result. The one-job runner unregistered after each attempt; only verified owned inactive dependencies/caches were reclaimed, retaining source, artifacts and logs. The rejected artifact-restoration action did not execute. Publication, provenance and registry-consumer acceptance remain unperformed.
