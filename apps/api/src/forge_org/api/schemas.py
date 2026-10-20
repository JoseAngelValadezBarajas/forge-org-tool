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
