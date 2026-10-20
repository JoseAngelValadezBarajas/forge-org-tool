from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Name is required")
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


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Name is required")
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

class EpicResponse(BaseModel):
    id: str
    project_id: str
    title: str
    description: str | None
    status: str
    created_at: datetime
    updated_at: datetime

class FeatureCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=4000)
    goal: str | None = Field(default=None, max_length=4000)
    epic_id: str | None = None
    priority: str = Field(default='medium', pattern='^(low|medium|high|critical)$')
    status: str = Field(default='backlog', pattern='^(backlog|refining|ready|in_progress|verify|done)$')

class FeatureResponse(BaseModel):
    id: str
    project_id: str
    epic_id: str | None
    title: str
    description: str | None
    goal: str | None
    priority: str
    status: str
    created_at: datetime
    updated_at: datetime

class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    status: str = Field(default='todo', pattern='^(todo|in_progress|done)$')
    position: int = Field(default=0, ge=0)

class TaskResponse(BaseModel):
    id: str; feature_id: str; title: str; description: str | None; status: str; position: int; created_at: datetime; updated_at: datetime

class CriterionUpdate(BaseModel):
    description: str | None = None; satisfied: bool | None = None; position: int | None = Field(default=None, ge=0)

class DependencyCreate(BaseModel):
    blocking_feature_id: str; blocked_feature_id: str

class DependencyResponse(BaseModel):
    id: str; project_id: str; blocking_feature_id: str; blocked_feature_id: str; created_at: datetime; updated_at: datetime

class CriterionCreate(BaseModel):
    description: str = Field(min_length=1, max_length=4000)
    position: int = Field(default=0, ge=0)

class CriterionResponse(BaseModel):
    id: str; feature_id: str; description: str; satisfied: bool; position: int; created_at: datetime; updated_at: datetime

class DecisionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200); context: str = Field(min_length=1, max_length=4000); decision: str = Field(min_length=1, max_length=4000); rationale: str = Field(min_length=1, max_length=4000); alternatives_considered: str | None = None; tradeoffs: str | None = None

class DecisionUpdate(BaseModel):
    title: str | None = None; context: str | None = None; decision: str | None = None; rationale: str | None = None; alternatives_considered: str | None = None; tradeoffs: str | None = None

class DecisionResponse(BaseModel):
    id: str; project_id: str; title: str; context: str; decision: str; rationale: str; alternatives_considered: str | None; tradeoffs: str | None; status: str; revision: int; superseded_by_id: str | None; created_at: datetime; updated_at: datetime

class InvariantCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200); statement: str = Field(min_length=1, max_length=4000); rationale: str = Field(min_length=1, max_length=4000); feature_id: str | None = None

class InvariantUpdate(BaseModel):
    title: str | None = None; statement: str | None = None; rationale: str | None = None

class InvariantResponse(BaseModel):
    id: str; project_id: str; feature_id: str | None; title: str; statement: str; rationale: str; status: str; revision: int; created_at: datetime; updated_at: datetime; acknowledged_revision: int | None = None

class AcknowledgeRequest(BaseModel):
    expected_revision: int = Field(ge=1)

class AcknowledgeResponse(BaseModel):
    feature_id: str; invariant_id: str; acknowledged_revision: int; acknowledged_at: datetime
