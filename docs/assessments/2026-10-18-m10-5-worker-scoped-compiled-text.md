# M10.5 worker-scoped compiled-text outcome

**Rejected at the required Metro session/cache isolation gate.** The owner approved inline execution as one complete slice. Its rejection path has been followed: preserve the candidate and failed evidence, restore shipping source/artifacts, verify restoration, and make one outcome commit. No production optimization or release exception is adopted.

The [evidence packet](../evidence/2026-10-18-m10-5-worker-scoped-compiled-text/README.md) isolates a concrete SDK 58 integration problem. Expo's supervising worker hashes the proposed private session field into the global transform-cache key, bypassing the assumption that Crumbs controls that key. Three same-store restarts each recompiled six ordinary modules and added seven disk entries (16 → 23 → 30 → 37). A separate installed-worker probe varied only the session token; its keys differed while identical-config controls stayed stable.

Removing the token inside Crumbs' transform function cannot fix a key already computed by the supervisor. The plan explicitly rejects ordinary-cache invalidation and per-session store growth. Its stop condition applies before expensive SDK/native/host qualification. Changing Expo's supervision or choosing another transport is a separate architecture proposal, not a routine gate waiver.

The candidate implemented bounded compiled-text ownership, pre/post mutable-input witnesses, fresh authoring, and private bound cache receipts. Targeted tests passed after observed fixes, but the candidate was not fully qualified. Packed native reuse also remained disabled by a generated CJS shim/local-binding collision; unsupported CJS graphs and Expo package-based tsconfig extends used conservative fresh paths. These limits are archived rather than hidden behind selective timing. No new complete host measurement ran; the 6.514 ms warm ceiling and all other limits remain unchanged.

Shipping restoration compares **948 source files and 181 distribution artifacts** with their pre-slice hashes. The unrelated primary checkout, `.superpowers/` siblings and generated Storybook iOS project were preserved. The outcome contains only documentation and sealed evidence; candidate source appears only inside its rejected-candidate archive.

**Next M10.5: exact-artifact release disposition**, with pin refresh and explicit choices. The existing publication block remains unless the owner separately authorizes a concrete version-specific exception or a later candidate passes the unchanged gates. Do not restart implementation from the rejected archive automatically.
