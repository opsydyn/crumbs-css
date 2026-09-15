# M1.8e: approved Metro direct-edit threshold

Alan Currie approved the M1.8d direct `.css.ts` Metro threshold in this session at 2026-09-15T10:53:08Z. The approved limits are 137.506 ms absolute and 10% relative to the retained 125.005 ms baseline. Both limits must pass under the exact Expo 56, Metro 0.84, React Native 0.85, macOS arm64, fixture and protocol fingerprint.

The decision uses the five retained M1.8d samples: 124.895–125.535 ms with 0.424% maximum deviation from the median. The 10% review margin is larger than twice the observed deviation, and the absolute limit is the baseline median plus that margin rounded upward to the next microsecond represented in milliseconds. Changing either value requires another explicit policy review.

The [approval comparison](../evidence/2026-09-15-metro-incremental-threshold-approval/comparison.json) reuses the already-retained exact-environment current run rather than manufacturing a new workload after approval. Its 126.227 ms median is 0.978% above baseline and passes both limits. All sixteen recorded host/editor metrics pass. The [updated review packet](../evidence/2026-09-15-metro-incremental-threshold-approval/threshold-review.json) contains sixteen approvals and no candidates.

Whole-registry performance qualification remains false. JS frames, UI frames and allocations have missing baselines and pending thresholds; retained memory remains diagnostic and pending. The dependency-only Metro control also remains red: its module changes, while the importing baked StyleSheet transform stays stale. This approval covers only direct `.css.ts` edit-to-full-bundle latency and does not weaken the M2.7 invalidation requirement.

This slice changes performance policy and its retained evaluation only. It does not change dependencies, public or runtime behavior, publish artifacts, or native Android status.
