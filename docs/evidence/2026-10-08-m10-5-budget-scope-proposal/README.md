# M10.5 budget-scope proposal snapshot

**Proposed, not approved.** This is a review snapshot, not an active budget registry, admitted baseline or product-performance result.

`proposal.json` preserves the four affected original row contracts and the seventeen unchanged host contracts. Caps are `ceil(minificationOnlyBytes × 1.10 / 1000) × 1000`. The 10% factor is a proposed engineering allowance for the initial compatibility-qualified candidate, not noise, mobile tolerance or later permissible growth. The baseline would be the actual independently qualified candidate graph size, with zero post-admission growth; this packet records no candidate baseline.

`collect.py` is the exact read-only collector used in the owned temporary directory. Its absolute repository/output paths require adaptation elsewhere. It reads the registry and prior scope review, derives proposed caps and retains reference hashes. It changes no source, budget or release gate.

From repository root:

```sh
python3 docs/evidence/2026-10-08-m10-5-budget-scope-proposal/verify.py
```

`verify.py` checks the proposal's unapproved status, four affected metric mappings/cap arithmetic, seventeen unchanged row contracts and reference hashes. It does not execute the proposed future release validator, admit the conditional baseline, verify API parity, or run the host/native gates. Negative controls are verifier-integrity probes only.

The complete proposed review contract is in [the written spec](../../superpowers/specs/2026-10-08-m10-5-expanded-runtime-budget-scope-design.md). Proposal drafting and its commit do not accept that policy. Physical-device/spoken-reader work remains deferred; no numerical mobile target is proposed.
