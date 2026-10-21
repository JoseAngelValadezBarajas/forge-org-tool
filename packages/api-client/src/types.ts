export type Workspace = {
  id: string;
  name: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
};

export type Epic = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: 'planning' | 'archived';
  created_at: string;
  updated_at: string;
};
export type Feature = {
  id: string;
  project_id: string;
  epic_id: string | null;
  title: string;
  description: string | null;
  goal: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'backlog' | 'refining' | 'ready' | 'in_progress' | 'verify' | 'done';
  created_at: string;
  updated_at: string;
};
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
export type Decision = {
  id: string;
  project_id: string;
  title: string;
  context: string;
  decision: string;
  rationale: string;
  status: string;
  revision: number;
  superseded_by_id: string | null;
  created_at: string;
  updated_at: string;
};
export type DecisionRevision = Decision & { decision_id: string };
export type Invariant = {
  id: string;
  project_id: string;
  feature_id: string | null;
  title: string;
  statement: string;
  rationale: string;
  status: string;
  revision: number;
  acknowledged_revision?: number | null;
  created_at: string;
  updated_at: string;
};
export type InvariantRevision = {
  id: string;
  invariant_id: string;
  revision: number;
  title: string;
  statement: string;
  rationale: string;
  status: string;
  feature_id: string | null;
  created_at: string;
};
export type Task = {
  id: string;
  feature_id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done';
  position: number;
  created_at: string;
  updated_at: string;
};
export type Criterion = {
  id: string;
  feature_id: string;
  description: string;
  satisfied: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};
export type Dependency = {
  id: string;
  project_id: string;
  blocking_feature_id: string;
  blocked_feature_id: string;
  created_at: string;
  updated_at: string;
};
export type Repository = {
  id: string;
  project_id: string;
  root_path: string;
  status: string;
  created_at: string;
  updated_at: string;
};
export type Observation = {
  id: string;
  repository_id: string;
  observed_at: string;
  head_sha: string | null;
  branch: string | null;
  detached: boolean;
  unborn: boolean;
  clean: boolean | null;
  tracked_modified_count: number;
  staged_count: number;
  untracked_count: number;
  observer_version: string;
  status: string;
  error_code: string | null;
  source_content_read: boolean;
};
export type FeatureRepositoryLink = { feature_id: string; repository_id: string };
export type ContextPackage = {
  id: string;
  project_id: string;
  feature_id: string;
  schema_version: string;
  fingerprint: string;
  payload_json: string;
  markdown: string;
  created_at: string;
};
export type ProjectTransferPreview = {
  schema_version: string;
  fingerprint: string;
  project: { name: string; description?: string | null };
  counts: Record<string, number>;
};
export type Run = {
  id: string;
  project_id: string;
  feature_id: string | null;
  title: string;
  description: string | null;
  execution_mode: string;
  executor_type: string;
  status: string;
  version: number;
  created_at: string;
  updated_at: string;
};
export type Handoff = {
  id: string;
  project_id: string;
  feature_id: string | null;
  run_id: string;
  title: string;
  summary: string;
  next_actions: string;
  status: string;
  current_revision: number | null;
  version: number;
  created_at: string;
  updated_at: string;
};
export type HandoffRevision = {
  id: string;
  handoff_id: string;
  revision: number;
  title: string;
  summary: string;
  next_actions: string;
  schema_version: string;
  fingerprint: string;
  payload_json: string;
  markdown: string;
  created_at: string;
};
export type Evidence = {
  id: string;
  project_id: string;
  feature_id: string | null;
  title: string;
  summary: string;
  provenance: string;
  reference_kind: string;
  reference_value: string;
  status: string;
  created_at: string;
  updated_at: string;
};
export type ReleaseCandidate = {
  id: string;
  project_id: string;
  title: string;
  summary: string;
  status: string;
  revision: number;
  fingerprint: string | null;
  created_at: string;
  updated_at: string;
};
export type CandidateHistory = {
  id: string;
  candidate_id: string;
  revision: number;
  status: string;
  snapshot_json: string;
  fingerprint: string;
  created_at: string;
};
export type Verification = {
  id: string | null;
  project_id: string;
  rule_id: string;
  candidate_id: string | null;
  outcome: string;
  input_fingerprint: string;
  blockers: string[];
  created_at: string | null;
  stale: boolean;
};
export type ReleaseManifest = {
  id: string;
  candidate_id: string;
  gate_evaluation_id: string;
  schema_version: string;
  fingerprint: string;
  status: string;
  payload_json: string;
  markdown: string;
  created_at: string;
};

export type Project = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};
