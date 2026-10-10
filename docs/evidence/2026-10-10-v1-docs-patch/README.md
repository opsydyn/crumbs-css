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

Publication and public registry verification will be appended after execution.
