import * as Schema from "effect/Schema"
import { makeDataCodec } from "../src/contracts/data-codec"

const Sha256 = Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/u))
const RelativePath = Schema.String.check(Schema.isPattern(/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*\\)[^\u0000]+$/u))
const ManifestFileSchema = Schema.Struct({ path: RelativePath, sha256: Sha256 })
const HostSchema = Schema.Struct({
  macOSProductVersion: Schema.NonEmptyString,
  darwinRelease: Schema.NonEmptyString,
  chip: Schema.NonEmptyString,
  architecture: Schema.NonEmptyString,
  bunVersion: Schema.NonEmptyString,
  npmVersion: Schema.NonEmptyString,
  nodeFloorVersion: Schema.NonEmptyString,
  nodeCurrentVersion: Schema.NonEmptyString,
  bunNodeCompatibilityVersion: Schema.NonEmptyString,
  tsdownVersion: Schema.NonEmptyString,
  typescriptVersion: Schema.NonEmptyString,
  tsgoVersion: Schema.NonEmptyString,
})

export const ReleaseQualificationManifestSchema = Schema.Struct({
  formatVersion: Schema.Literal(1),
  releaseTag: Schema.String.check(Schema.isPattern(/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u)),
  sourceRevision: Schema.String.check(Schema.isPattern(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u)),
  sourceDigest: Sha256,
  host: HostSchema,
  reportDirectory: Schema.Literal("host-report"),
  reportFiles: Schema.Array(ManifestFileSchema),
  reportDigest: Sha256,
  packageName: Schema.NonEmptyString,
  packageVersion: Schema.NonEmptyString,
  packageArtifacts: Schema.Array(ManifestFileSchema),
  tarballName: Schema.String.check(Schema.isPattern(/^[^/\\]+\.tgz$/u)),
  tarballSha256: Sha256,
})

export type ReleaseQualificationManifest = typeof ReleaseQualificationManifestSchema.Type
export const releaseQualificationManifestCodec = makeDataCodec(
  "release-qualification-manifest",
  ReleaseQualificationManifestSchema,
)
