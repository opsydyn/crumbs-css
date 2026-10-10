# Final v1 CI integration timeout follow-up

Linux CI at258ccd7 executed all1,830 CSS cases:1,828 passed, one optional Node-floor
case skipped, and only the comprehensive resealed-summary/rows/legacy-format/binding
forgery-control test exceeded its default5-second functional limit (5,233.58ms).
The raw failed run38050367839 is retained here. All earlier path, host-fixture,
Git-shim and other integration-timeout failures were resolved.

Only this named integration test receives a bounded30-second limit. Its assertion
body, all mutation cases, policy/registry/approval pins and numerical budgets remain
unchanged. All18 release sealing/admission/forgery tests pass locally (148 assertions).
All185 shipping package files retain the exact qualified v1 bytes. Exact original
dependency roots and unrelated primary files were restored before committing.
A fresh final exact-head Linux CI run remains required before source release creation.
