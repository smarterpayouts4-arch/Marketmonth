export {
  DISCOVERY_CSV_SCHEMA_VERSION,
  DISCOVERY_CSV_HEADERS,
  serializeDiscoveryCsv,
  buildDiscoveryCsvDocument,
  buildBrandProfileCsvRows,
  buildEvidenceCsvRows,
  buildStrategyCsvRow,
  buildSignalCsvRows,
  buildFaqCsvRows,
  buildOfferCsvRows,
  buildCrawlMetaCsvRows,
  parseCompanyCsv,
  artifactHashOfCsv,
  assertDiscoveryCsvHeader,
  assertDiscoveryCsvSchemaVersion,
  assertDiscoveryCsvContract,
  validateDiscoveryCsvRows,
  discoveryCsvRowSchema,
  discoveryCsvEvidenceTypeSchema,
  discoveryCsvConfidenceSchema,
  type DiscoveryCsvRow,
  type DiscoveryCsvContractIssue,
} from "./csv-contract";

export {
  writeArtifact,
  readArtifact,
  readArtifactAsync,
  artifactDiskPath,
  artifactRelativePath,
  type ArtifactState,
} from "./artifact-store";

export {
  readCompanyProfile,
  readCompanyProfileAsync,
  tryReadCompanyProfile,
  tryReadCompanyProfileAsync,
  readCompanyProfileAsBrainContext,
  readCompanyProfileAsBrainContextAsync,
  type ReadCompanyProfileOptions,
} from "./read-company-profile";

export { projectionToBrainContext } from "./to-brain-context";

export {
  projectionToActivationInput,
  type ActivationInput,
} from "./to-activation-input";

export {
  materializeCompanyProfile,
  type MaterializeCompanyProfileInput,
} from "./materialize";

export { companyArtifactPaths } from "./company-paths";

export {
  loadCompanyBrand,
  tryLoadCompanyBrand,
  type LoadedCompanyBrand,
} from "./load-company-brand";

export type {
  CompanyProfileProjection,
  FieldEvidenceType,
  FieldProvenance,
  ProjectedField,
  ProjectionFaq,
  ProjectionOffer,
  ProjectionEvidence,
} from "./projection.schema";

export {
  companyProfileProjectionSchema,
  fieldEvidenceTypeSchema,
} from "./projection.schema";
