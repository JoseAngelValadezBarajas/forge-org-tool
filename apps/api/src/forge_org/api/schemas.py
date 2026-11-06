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
    archived_at: datetime | None = None


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
    status: str
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


class ImportPreviewResponse(BaseModel):
    schema_version: str
    fingerprint: str
    project: dict[str, Any]
    counts: dict[str, int]
    destination: dict[str, str] | None = None


class ImportCommitRequest(BaseModel):
    document: dict[str, Any]
    expected_fingerprint: str


class ProjectPackagePreviewRequest(BaseModel):
    archive_base64: str = Field(min_length=1, max_length=7_000_000)


class ProjectPackageImportRequest(ProjectPackagePreviewRequest):
    expected_fingerprint: str = Field(min_length=64, max_length=64)


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
