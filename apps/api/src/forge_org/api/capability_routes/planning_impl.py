# ruff: noqa: B008
"""planning HTTP capability routes."""

import sqlite3
from typing import Any

from fastapi import APIRouter, Depends, Query

from forge_org.api.dependencies import knowledge_service, planning_service, service_error
from forge_org.api.schemas import (
    CriterionCreate,
    CriterionReorderRequest,
    CriterionResponse,
    CriterionUpdate,
    DependencyCreate,
    DependencyResponse,
    EpicCreate,
    EpicResponse,
    EpicUpdate,
    FeatureCreate,
    FeatureResponse,
    FeatureUpdate,
    TaskCreate,
    TaskResponse,
    TaskUpdate,
    WorkspaceTagCreate,
    WorkspaceTagResponse,
    WorkspaceTagUpdate,
)
from forge_org.application.knowledge import KnowledgeService
from forge_org.application.organization import DuplicateName, InvalidInput, NotFound
from forge_org.application.planning import PlanningService

capability_router = APIRouter(prefix='/api/v1', tags=['organization'])


@capability_router.get('/workspaces/{workspace_id}/projects/{project_id}/planning/overview')
def planning_overview(
    workspace_id: str, project_id: str, planning: PlanningService = Depends(planning_service)
) -> dict[str, Any]:
    try:
        return planning.overview(workspace_id, project_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/epics', response_model=list[EpicResponse]
)
def list_epics(
    workspace_id: str, project_id: str, planning: PlanningService = Depends(planning_service)
) -> list[dict[str, Any]]:
    try:
        return planning.list_epics(workspace_id, project_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/epics',
    response_model=EpicResponse,
    status_code=201,
)
def create_epic(
    workspace_id: str,
    project_id: str,
    payload: EpicCreate,
    planning: PlanningService = Depends(planning_service),
) -> dict[str, Any]:
    try:
        return planning.create_epic(
            workspace_id,
            project_id,
            payload.title,
            payload.description,
            payload.priority,
            payload.tags,
        )
    except (LookupError, ValueError) as exc:
        raise service_error(
            NotFound(str(exc)) if isinstance(exc, LookupError) else InvalidInput(str(exc))
        ) from exc


@capability_router.get('/workspaces/{workspace_id}/tags', response_model=list[WorkspaceTagResponse])
def list_workspace_tags(
    workspace_id: str, planning: PlanningService = Depends(planning_service)
) -> list[dict[str, Any]]:
    try:
        return planning.workspace_tags(workspace_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/tags', response_model=WorkspaceTagResponse, status_code=201
)
def create_workspace_tag(
    workspace_id: str,
    payload: WorkspaceTagCreate,
    planning: PlanningService = Depends(planning_service),
) -> dict[str, Any]:
    try:
        return planning.create_workspace_tag(workspace_id, payload.name, payload.color)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc
    except sqlite3.IntegrityError as exc:
        raise service_error(DuplicateName('Tag name already exists in this workspace')) from exc


@capability_router.patch(
    '/workspaces/{workspace_id}/tags/{tag_id}', response_model=WorkspaceTagResponse
)
def update_workspace_tag(
    workspace_id: str,
    tag_id: str,
    payload: WorkspaceTagUpdate,
    planning: PlanningService = Depends(planning_service),
) -> dict[str, Any]:
    try:
        return planning.update_workspace_tag(
            workspace_id, tag_id, payload.model_dump(exclude_unset=True)
        )
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc
    except sqlite3.IntegrityError as exc:
        raise service_error(DuplicateName('Tag name already exists in this workspace')) from exc


@capability_router.delete('/workspaces/{workspace_id}/tags/{tag_id}', status_code=204)
def delete_workspace_tag(
    workspace_id: str,
    tag_id: str,
    planning: PlanningService = Depends(planning_service),
) -> None:
    try:
        planning.delete_workspace_tag(workspace_id, tag_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.patch(
    '/workspaces/{workspace_id}/projects/{project_id}/epics/{epic_id}', response_model=EpicResponse
)
def update_epic(
    workspace_id: str,
    project_id: str,
    epic_id: str,
    payload: EpicUpdate,
    planning: PlanningService = Depends(planning_service),
) -> dict[str, Any]:
    try:
        return planning.update_epic(
            workspace_id, project_id, epic_id, payload.model_dump(exclude_unset=True)
        )
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/features',
    response_model=list[FeatureResponse],
)
def list_features(
    workspace_id: str,
    project_id: str,
    search: str | None = None,
    status_filter: str | None = Query(default=None, alias='status'),
    priority: str | None = None,
    epic_id: str | None = None,
    planning: PlanningService = Depends(planning_service),
) -> list[dict[str, Any]]:
    try:
        return planning.list_features(
            workspace_id, project_id, search, status_filter, priority, epic_id
        )
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/features',
    response_model=FeatureResponse,
    status_code=201,
)
def create_feature(
    workspace_id: str,
    project_id: str,
    payload: FeatureCreate,
    planning: PlanningService = Depends(planning_service),
) -> dict[str, Any]:
    try:
        return planning.create_feature(workspace_id, project_id, payload.model_dump())
    except (LookupError, ValueError) as exc:
        raise service_error(
            NotFound(str(exc)) if isinstance(exc, LookupError) else InvalidInput(str(exc))
        ) from exc


@capability_router.patch(
    '/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}',
    response_model=FeatureResponse,
)
def update_feature(
    workspace_id: str,
    project_id: str,
    feature_id: str,
    payload: FeatureUpdate,
    planning: PlanningService = Depends(planning_service),
) -> dict[str, Any]:
    try:
        return planning.update_feature(
            workspace_id, project_id, feature_id, payload.model_dump(exclude_unset=True)
        )
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc


@capability_router.patch(
    '/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/acceptance-criteria/{criterion_id}',
    response_model=CriterionResponse,
)
def update_criterion(
    workspace_id: str,
    project_id: str,
    feature_id: str,
    criterion_id: str,
    payload: CriterionUpdate,
    planning: PlanningService = Depends(planning_service),
) -> dict[str, Any]:
    try:
        return planning.update_criterion(
            workspace_id,
            project_id,
            feature_id,
            criterion_id,
            payload.model_dump(exclude_unset=True),
        )
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc


@capability_router.delete(
    '/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/acceptance-criteria/{criterion_id}',
    status_code=204,
)
def delete_criterion(
    workspace_id: str,
    project_id: str,
    feature_id: str,
    criterion_id: str,
    planning: PlanningService = Depends(planning_service),
) -> None:
    try:
        planning.delete_criterion(workspace_id, project_id, feature_id, criterion_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/acceptance-criteria/reorder',
    response_model=list[CriterionResponse],
)
def reorder_criteria(
    workspace_id: str,
    project_id: str,
    feature_id: str,
    payload: CriterionReorderRequest,
    planning: PlanningService = Depends(planning_service),
) -> list[dict[str, Any]]:
    try:
        return planning.reorder_criteria(workspace_id, project_id, feature_id, payload.ids)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/tasks',
    response_model=list[TaskResponse],
)
def list_tasks(
    workspace_id: str,
    project_id: str,
    feature_id: str,
    planning: PlanningService = Depends(planning_service),
) -> list[dict[str, Any]]:
    try:
        return planning.tasks(workspace_id, project_id, feature_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/tasks',
    response_model=TaskResponse,
    status_code=201,
)
def create_task(
    workspace_id: str,
    project_id: str,
    feature_id: str,
    payload: TaskCreate,
    planning: PlanningService = Depends(planning_service),
) -> dict[str, Any]:
    try:
        return planning.create_task(workspace_id, project_id, feature_id, payload.model_dump())
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc


@capability_router.patch(
    '/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/tasks/{task_id}',
    response_model=TaskResponse,
)
def update_task(
    workspace_id: str,
    project_id: str,
    feature_id: str,
    task_id: str,
    payload: TaskUpdate,
    planning: PlanningService = Depends(planning_service),
) -> dict[str, Any]:
    try:
        return planning.update_task(
            workspace_id, project_id, feature_id, task_id, payload.model_dump(exclude_unset=True)
        )
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/tasks/reorder',
    response_model=list[TaskResponse],
)
def reorder_tasks(
    workspace_id: str,
    project_id: str,
    feature_id: str,
    payload: dict[str, list[str]],
    planning: PlanningService = Depends(planning_service),
) -> list[dict[str, Any]]:
    try:
        return planning.reorder_tasks(workspace_id, project_id, feature_id, payload.get('ids', []))
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/dependencies',
    response_model=list[DependencyResponse],
)
def list_dependencies(
    workspace_id: str, project_id: str, planning: PlanningService = Depends(planning_service)
) -> list[dict[str, Any]]:
    try:
        return planning.dependencies(workspace_id, project_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/dependencies',
    response_model=DependencyResponse,
    status_code=201,
)
def create_dependency(
    workspace_id: str,
    project_id: str,
    payload: DependencyCreate,
    planning: PlanningService = Depends(planning_service),
) -> dict[str, Any]:
    try:
        return planning.create_dependency(workspace_id, project_id, payload.model_dump())
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc
    except sqlite3.IntegrityError as exc:
        raise service_error(DuplicateName('Dependency already exists')) from exc


@capability_router.delete(
    '/workspaces/{workspace_id}/projects/{project_id}/dependencies/{dependency_id}', status_code=204
)
def delete_dependency(
    workspace_id: str,
    project_id: str,
    dependency_id: str,
    planning: PlanningService = Depends(planning_service),
) -> None:
    try:
        planning.delete_dependency(workspace_id, project_id, dependency_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.get(
    '/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/acceptance-criteria',
    response_model=list[CriterionResponse],
)
def list_criteria(
    workspace_id: str,
    project_id: str,
    feature_id: str,
    knowledge: KnowledgeService = Depends(knowledge_service),
) -> list[dict[str, Any]]:
    try:
        return knowledge.criteria(workspace_id, project_id, feature_id)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc


@capability_router.post(
    '/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/acceptance-criteria',
    response_model=CriterionResponse,
    status_code=201,
)
def create_criterion(
    workspace_id: str,
    project_id: str,
    feature_id: str,
    payload: CriterionCreate,
    knowledge: KnowledgeService = Depends(knowledge_service),
) -> dict[str, Any]:
    try:
        return knowledge.create_criterion(workspace_id, project_id, feature_id, payload.description)
    except LookupError as exc:
        raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc:
        raise service_error(InvalidInput(str(exc))) from exc
