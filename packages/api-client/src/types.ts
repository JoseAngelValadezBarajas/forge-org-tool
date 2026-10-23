import type { components } from './generated/openapi.js';

type Schema = components['schemas'];

/** Response models are aliases to the generated backend OpenAPI contract. */
export type Workspace = Schema['WorkspaceResponse'];
export type Project = Schema['ProjectResponse'];
export type ProjectUpdate = Schema['ProjectUpdate'];
export type Epic = Schema['EpicResponse'];
export type Feature = Schema['FeatureResponse'];
export type Decision = Schema['DecisionResponse'];
export type DecisionRevision = Schema['DecisionRevisionResponse'];
export type Invariant = Schema['InvariantResponse'];
export type InvariantRevision = Schema['InvariantRevisionResponse'];
export type Task = Schema['TaskResponse'];
export type Criterion = Schema['CriterionResponse'];
export type Dependency = Schema['DependencyResponse'];
export type Repository = Schema['RepositoryResponse'];
export type Observation = Schema['ObservationResponse'];
export type ContextPackage = Schema['ContextPackageResponse'];
export type ProjectTransferPreview = {
  schema_version: Schema['ImportPreviewResponse']['schema_version'];
  fingerprint: Schema['ImportPreviewResponse']['fingerprint'];
  counts: Schema['ImportPreviewResponse']['counts'];
  project: { name: string; description?: string | null };
};
export type Run = Schema['RunResponse'];
export type RunEvent = Schema['RunEventResponse'];
export type RunEventCreate = Schema['RunEventCreate'];
export type Handoff = Schema['HandoffResponse'];
export type HandoffRevision = Schema['HandoffRevisionResponse'];
export type Evidence = Schema['EvidenceResponse'];
export type ReleaseCandidate = Schema['CandidateResponse'];
export type CandidateHistory = Schema['CandidateHistoryResponse'];
export type Verification = Schema['VerificationResponse'];
export type ReleaseManifest = Schema['ManifestResponse'];

export type PlanningOverview = {
  epics: Array<Epic & { features: Feature[] }>;
  unassigned_features: Feature[];
};

export type ReadinessResult = {
  feature_id: string;
  evaluated_at: string;
  rule_set_version: string;
  input_fingerprint: string;
  outcome: 'READY_TO_START' | 'NOT_READY';
  passed_checks: string[];
  failed_checks: string[];
  blockers: Array<{ code: string; message: string }>;
  results: Array<{ rule_id: string; result: string; explanation: string }>;
  stale?: boolean;
  evaluation_id?: string;
};

export type FeatureRepositoryLink = { feature_id: string; repository_id: string };
