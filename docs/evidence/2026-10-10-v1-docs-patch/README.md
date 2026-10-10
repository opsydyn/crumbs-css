# M10.5 v1.0.1 documentation correction

The user authorised a documentation-only patch and publication. The public v1.0.0
README still described npm publication as pending, despite verified publication.
The patch also corrects packaged compatibility notes and current onboarding.

[Preparation](preparation.json), [real archive comparison](local-candidate-verification.json),
[11 guard controls](guard-green.log) and the [33-page docs build](docs-build.json)
verify the candidate. The local archive comparison is preparation evidence,
not a sealed release receipt. Exactly three of 185 package files change: README,
COMPATIBILITY and package.json version. All 105 JavaScript and 76 declaration
files, the license, exports, dependencies and peers are preserved.

The one-off publisher validates the immutable base source and public tarball
SHA-256, checks product source/config identity, and binds permitted document
bytes to the exact patch tag. A second host rechecks the sealed inventory before
npm upload with provenance. It is limited to 1.0.1 and leaves normal release
workflows and generic performance policy unchanged. No fresh performance pass,
physical acceptance or extension of the original numerical exception is claimed.

The [runtime control RED](guard-red-runtime.log) and [quoted-path control RED](quoted-path-red.log)
retain the failures before the guard fixes. A separate reviewer independently
verified non-ASCII/tab/newline source rejection and approved the final publisher.

## Published and verified

[Run 38073193078](https://github.com/opsydyn/crumbs-css/actions/runs/38073193078)
passes both the qualifier and independent Ubuntu publisher. The actual
[workflow](publication-workflow.json), [upload log](publication-workflow.log) and
[sealed inventory](sealed-manifest.json) bind release source
`a5cf1c97338affbb64cf43bd4a08058dc1135ff0` and tarball
`3cbbb9d73cdaab0257f4249189c5a8f033bc05513c95c7770ffa4b3e0a0f4a6a`.

[Public registry verification](registry-verification.json), [npm CLI](npm-view.json),
[metadata](npm-metadata.json) and [tags](npm-dist-tags.json) independently confirm
version/latest 1.0.1 and matching SHA-256/SHA-512 integrity. npm announced a brief
processing delay; the initial public 404 is retained in [observation](registry-processing.json),
and no second upload was attempted. The [displayed README receipt](npm-readme-verification.json)
confirms it matches source/published bytes and no longer contains the warning.

[Attestations](npm-attestations.json) and [cryptographic verification](npm-provenance-verification.json)
verify signer identity, exact workflow/source/run, artifact SHA-512 and mutated
signed-payload rejection. The manifest separately binds inherited v1.0.0 bytes.

[Installed consumer verification](installed-consumer-verification.json),
[command log](installed-consumer.log) and [registry lock](installed-registry-lock.json)
confirm all 185 physical installed files match the public tarball, strict typing,
real iOS/Android/web exports and runtime source-map admission. The existing owned
Expo dependencies were reused and app source stayed unchanged; this is not a
fresh dependency bootstrap or physical-device acceptance.

[Exact release-commit CI](prepublication-ci.json) and the [stable GitHub release](github-release-verification.json)
pass. [Current status](publication-status.json) closes the M10.5 documentation
correction. The original v1.0.0 tag, normal release workflows, numerical policy
and unrelated primary-checkout dirty files remain unchanged. M11.6 remains parked.

The [final documentation build](published-docs-build.json) passes all 33 pages; compiler identity examples now use 1.0.1. Its owned source inputs were restored byte-for-byte after the build.
