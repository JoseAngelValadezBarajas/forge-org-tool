from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)

    @field_validator('name')
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError('Name is required')
        return value


class WorkspaceUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    description: str | None = Field(default=None, max_length=2000)


class WorkspaceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime


class WorkspaceTagResponse(BaseModel):
    id: str
    workspace_id: str
    name: str
    color: str
    created_at: datetime


class WorkspaceTagCreate(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    color: str = Field(default='#6b7280', pattern='^#[0-9A-Fa-f]{6}$')


class WorkspaceTagUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=40)
    color: str | None = Field(default=None, pattern='^#[0-9A-Fa-f]{6}$')


class BugAttachmentCreate(BaseModel):
    file_name: str = Field(min_length=1, max_length=255)
    content_type: Literal['image/png', 'image/jpeg', 'image/webp']
    data_base64: str = Field(min_length=1, max_length=7_000_000)


class BugAttachmentResponse(BaseModel):
    id: str
    feature_id: str
    file_name: str
    content_type: str
    byte_size: int
    sha256: str
    created_at: datetime


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)

    @field_validator('name')
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError('Name is required')
        return value


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    description: str | None = Field(default=None, max_length=2000)


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    workspace_id: str
    name: str
    description: str | None
    status: str
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None


class EpicCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=4000)
    priority: str = Field(default='medium', pattern='^(low|medium|high|critical)$')
    tags: list[str] = Field(default_factory=list, max_length=20)


EpicStatus = Literal['backlog', 'ready', 'in_progress', 'verify', 'done']


class EpicUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=4000)
    status: EpicStatus | None = None
    priority: str | None = Field(default=None, pattern='^(low|medium|high|critical)$')
    tags: list[str] | None = Field(default=None, max_length=20)


class EpicResponse(BaseModel):
    id: str
    project_id: str
    title: str
    description: str | None
    status: EpicStatus
    priority: str = 'medium'
    tags: list[str] = Field(default_factory=list)
    feature_count: int = 0
    completed_feature_count: int = 0
    progress: int = 0
    archived_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class FeatureCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=4000)
    goal: str | None = Field(default=None, max_length=4000)
    epic_id: str | None = None
    priority: str = Field(default='medium', pattern='^(low|medium|high|critical)$')
    status: str = Field(
        default='backlog', pattern='^(backlog|refining|ready|in_progress|verify|done)$'
    )
    kind: Literal['story', 'bug'] = 'story'
    bug_severity: Literal['low', 'medium', 'high', 'critical'] | None = None
    steps_to_reproduce: str | None = Field(default=None, max_length=8000)
    expected_result: str | None = Field(default=None, max_length=4000)
    actual_result: str | None = Field(default=None, max_length=4000)
    tags: list[str] = Field(default_factory=list, max_length=20)
    notes: str | None = Field(default=None, max_length=8000)


class FeatureUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=4000)
    goal: str | None = Field(default=None, max_length=4000)
    epic_id: str | None = None
    clear_epic: bool = False
    priority: str | None = Field(default=None, pattern='^(low|medium|high|critical)$')
    status: str | None = Field(
        default=None, pattern='^(backlog|refining|ready|in_progress|verify|done)$'
    )
    kind: Literal['story', 'bug'] | None = None
    bug_severity: Literal['low', 'medium', 'high', 'critical'] | None = None
    steps_to_reproduce: str | None = Field(default=None, max_length=8000)
    expected_result: str | None = Field(default=None, max_length=4000)
    actual_result: str | None = Field(default=None, max_length=4000)
    tags: list[str] | None = Field(default=None, max_length=20)
    notes: str | None = Field(default=None, max_length=8000)


class FeatureResponse(BaseModel):
    id: str
    project_id: str
    epic_id: str | None
    title: str
    description: str | None
    goal: str | None
    priority: str
    status: str
    kind: str = 'feature'
    bug_severity: str | None = None
    steps_to_reproduce: str | None = None
    expected_result: str | None = None
    actual_result: str | None = None
    tags: list[str] = Field(default_factory=list)
    notes: str | None = None
    created_at: datetime
    updated_at: datetime


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    status: str = Field(default='todo', pattern='^(todo|in_progress|done)$')
    position: int = Field(default=0, ge=0)


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    status: str | None = Field(default=None, pattern='^(todo|in_progress|done)$')
    position: int | None = Field(default=None, ge=0)


class TaskResponse(BaseModel):
    id: str
    feature_id: str
    title: str
    description: str | None
    status: str
    position: int
    created_at: datetime
    updated_at: datetime


class CriterionUpdate(BaseModel):
    description: str | None = None
    satisfied: bool | None = None
    position: int | None = Field(default=None, ge=0)


class CriterionReorderRequest(BaseModel):
    ids: list[str] = Field(max_length=2000)


class DependencyCreate(BaseModel):
    blocking_feature_id: str
    blocked_feature_id: str


class DependencyResponse(BaseModel):
    id: str
    project_id: str
    blocking_feature_id: str
    blocked_feature_id: str
    created_at: datetime
    updated_at: datetime


class RepositoryCreate(BaseModel):
    root_path: str = Field(min_length=1, max_length=1000)


class RepositoryResponse(BaseModel):
    id: str
    project_id: str
    root_path: str
    status: str
    created_at: datetime
    updated_at: datetime


class ObservationResponse(BaseModel):
    id: str
    repository_id: str
    observed_at: datetime
    head_sha: str | None
    branch: str | None
    detached: bool
    unborn: bool
    clean: bool | None
    tracked_modified_count: int
    staged_count: int
    untracked_count: int
    observer_version: str
    status: str
    error_code: str | None
    source_content_read: bool


class RepositoryLinkCreate(BaseModel):
    repository_id: str


class ContextPackageResponse(BaseModel):
    id: str
    project_id: str
    feature_id: str
    schema_version: str
    fingerprint: str
    payload_json: str
    markdown: str
    created_at: datetime


class RunCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    feature_id: str | None = None
    context_package_id: str | None = None
    execution_mode: str = 'manual'
    executor_type: str = 'human'
    executor_label: str | None = None


class RunStatusUpdate(BaseModel):
    status: str
    expected_version: int = Field(ge=1)


class RunEventCreate(BaseModel):
    event_type: str
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    expected_version: int = Field(ge=1)
    occurred_at: str | None = None
    supersedes_event_id: str | None = None


class RunResponse(BaseModel):
    id: str
    project_id: str
    feature_id: str | None
    context_package_id: str | None
    title: str
    description: str | None
    execution_mode: str
    executor_type: str
    executor_label: str | None
    status: str
    version: int
    created_at: datetime
    updated_at: datetime


class RunEventResponse(BaseModel):
    id: str
    run_id: str
    event_type: str
    title: str
    description: str | None
    origin: str
    occurred_at: str | None
    supersedes_event_id: str | None
    created_at: datetime


class HandoffCreate(BaseModel):
    title: str = ''
    feature_id: str | None = None
    context_package_id: str | None = None


class HandoffUpdate(BaseModel):
    expected_version: int = Field(ge=1)
    title: str | None = None
    summary: str | None = None
    next_actions: str | None = None


class HandoffVersionRequest(BaseModel):
    expected_version: int = Field(ge=1)


class HandoffAckRequest(BaseModel):
    expected_revision: int = Field(ge=1)
    acknowledged_by: str = Field(min_length=1, max_length=200)


class HandoffResponse(BaseModel):
    id: str
    project_id: str
    feature_id: str | None
    run_id: str
    context_package_id: str | None
    title: str
    summary: str
    next_actions: str
    status: str
    current_revision: int | None
    version: int
    created_at: datetime
    updated_at: datetime


class HandoffAcknowledgementResponse(BaseModel):
    id: str
    handoff_id: str
    revision: int
    acknowledged_by: str
    acknowledged_at: datetime


class HandoffRevisionResponse(BaseModel):
    id: str
    handoff_id: str
    revision: int
    title: str
    summary: str
    next_actions: str
    schema_version: str
    fingerprint: str
    payload_json: str
    markdown: str
    created_at: datetime


class EvidenceCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    summary: str = Field(min_length=1, max_length=4000)
    provenance: str
    reference_kind: str
    reference_value: str
    feature_id: str | None = None


class EvidenceResponse(BaseModel):
    id: str
    project_id: str
    feature_id: str | None
    title: str
    summary: str
    provenance: str
    reference_kind: str
    reference_value: str
    status: str
    created_at: datetime
    updated_at: datetime


class CandidateCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    summary: str = Field(min_length=1, max_length=4000)


class CandidateUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    summary: str | None = Field(default=None, min_length=1, max_length=4000)


class CandidateFreezeRequest(BaseModel):
    expected_revision: int = Field(ge=1)


class CandidateResponse(BaseModel):
    id: str
    project_id: str
    title: str
    summary: str
    status: str
    revision: int
    fingerprint: str | None
    created_at: datetime
    updated_at: datetime


class CandidateHistoryResponse(BaseModel):
    id: str
    candidate_id: str
    revision: int
    status: str
    snapshot_json: str
    fingerprint: str
    created_at: datetime


class GateEvaluationResponse(BaseModel):
    id: str | None = None
    candidate_id: str
    candidate_revision: int
    outcome: str
    input_fingerprint: str
    blockers: list[str]
    created_at: datetime | None = None


class VerificationRequest(BaseModel):
    rule_id: str
    candidate_id: str | None = None


class VerificationRuleResponse(BaseModel):
    id: str
    label: str
    description: str


class VerificationResponse(BaseModel):
    id: str | None = None
    project_id: str
    rule_id: str
    candidate_id: str | None
    outcome: str
    input_fingerprint: str
    blockers: list[str]
    created_at: datetime | None = None
    stale: bool = False


class ManifestSaveRequest(BaseModel):
    gate_evaluation_id: str


class ManifestResponse(BaseModel):
    id: str
    candidate_id: str
    gate_evaluation_id: str
    schema_version: str
    fingerprint: str
    status: str
    payload_json: str
    markdown: str
    created_at: datetime


class ImportPreviewResponse(BaseModel):
    schema_version: str
    fingerprint: str
    project: dict[str, Any]
    counts: dict[str, int]


class ImportCommitRequest(BaseModel):
    document: dict[str, Any]
    expected_fingerprint: str


class ImportResponse(BaseModel):
    schema_version: str
    workspace_id: str
    project_id: str
    fingerprint: str
    references: list[dict[str, str]]
    counts: dict[str, int]


class CriterionCreate(BaseModel):
    description: str = Field(min_length=1, max_length=4000)
    position: int = Field(default=0, ge=0)


class CriterionResponse(BaseModel):
    id: str
    feature_id: str
    description: str
    satisfied: bool
    position: int
    created_at: datetime
    updated_at: datetime


class DecisionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    context: str = Field(min_length=1, max_length=4000)
    decision: str = Field(min_length=1, max_length=4000)
    rationale: str = Field(min_length=1, max_length=4000)
    alternatives_considered: str | None = None
    tradeoffs: str | None = None


class DecisionUpdate(BaseModel):
    title: str | None = None
    context: str | None = None
    decision: str | None = None
    rationale: str | None = None
    alternatives_considered: str | None = None
    tradeoffs: str | None = None


class DecisionResponse(BaseModel):
    id: str
    project_id: str
    title: str
    context: str
    decision: str
    rationale: str
    alternatives_considered: str | None
    tradeoffs: str | None
    status: str
    revision: int
    superseded_by_id: str | None
    created_at: datetime
    updated_at: datetime


class DecisionRevisionResponse(BaseModel):
    id: str
    decision_id: str
    revision: int
    title: str
    context: str
    decision: str
    rationale: str
    alternatives_considered: str | None
    tradeoffs: str | None
    status: str
    superseded_by_id: str | None
    created_at: datetime


class InvariantCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    statement: str = Field(min_length=1, max_length=4000)
    rationale: str = Field(min_length=1, max_length=4000)
    feature_id: str | None = None


class InvariantUpdate(BaseModel):
    title: str | None = None
    statement: str | None = None
    rationale: str | None = None


class InvariantResponse(BaseModel):
    id: str
    project_id: str
    feature_id: str | None
    title: str
    statement: str
    rationale: str
    status: str
    revision: int
    created_at: datetime
    updated_at: datetime
    acknowledged_revision: int | None = None


class InvariantRevisionResponse(BaseModel):
    id: str
    invariant_id: str
    revision: int
    title: str
    statement: str
    rationale: str
    status: str
    feature_id: str | None
    created_at: datetime


class AcknowledgeRequest(BaseModel):
    expected_revision: int = Field(ge=1)


class AcknowledgeResponse(BaseModel):
    feature_id: str
    invariant_id: str
    acknowledged_revision: int
    acknowledged_at: datetime
