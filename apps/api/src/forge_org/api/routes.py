# ruff: noqa: B008
import sqlite3
from collections.abc import Iterator
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from forge_org.api.schemas import (
    AcknowledgeRequest,
    AcknowledgeResponse,
    CriterionCreate,
    CriterionResponse,
    CriterionUpdate,
    DecisionCreate,
    DecisionResponse,
    DecisionUpdate,
    DependencyCreate,
    DependencyResponse,
    EpicCreate,
    EpicResponse,
    FeatureCreate,
    FeatureResponse,
    InvariantCreate,
    InvariantResponse,
    InvariantUpdate,
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
    TaskCreate,
    TaskResponse,
    WorkspaceCreate,
    WorkspaceResponse,
    WorkspaceUpdate,
)
from forge_org.application.knowledge import KnowledgeService
from forge_org.application.organization import (
    DuplicateName,
    InvalidInput,
    NotFound,
    OrganizationService,
)
from forge_org.application.planning import PlanningService
from forge_org.application.readiness import ReadinessService
from forge_org.infrastructure.sqlite import connect

router = APIRouter(prefix="/api/v1", tags=["organization"])


def database() -> Iterator[sqlite3.Connection]:
    connection = connect()
    try:
        yield connection
    finally:
        connection.close()


def service(connection: sqlite3.Connection = Depends(database)) -> OrganizationService:
    return OrganizationService(connection)


def service_error(exc: Exception) -> HTTPException:
    if isinstance(exc, NotFound):
        return HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, DuplicateName):
        return HTTPException(status_code=409, detail=str(exc))
    if isinstance(exc, InvalidInput):
        return HTTPException(status_code=422, detail=str(exc))
    if isinstance(exc, RuntimeError):
        return HTTPException(status_code=409, detail=str(exc))
    return HTTPException(status_code=500, detail="Unexpected organization error")

def planning_service(connection: sqlite3.Connection = Depends(database)) -> PlanningService:
    return PlanningService(connection)

@router.get('/workspaces/{workspace_id}/projects/{project_id}/planning/overview')
def planning_overview(workspace_id: str, project_id: str, planning: PlanningService = Depends(planning_service)) -> dict[str, Any]:
    try: return planning.overview(workspace_id, project_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/epics', response_model=list[EpicResponse])
def list_epics(workspace_id: str, project_id: str, planning: PlanningService = Depends(planning_service)) -> list[dict[str, Any]]:
    try: return planning.list_epics(workspace_id, project_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/epics', response_model=EpicResponse, status_code=201)
def create_epic(workspace_id: str, project_id: str, payload: EpicCreate, planning: PlanningService = Depends(planning_service)) -> dict[str, Any]:
    try: return planning.create_epic(workspace_id, project_id, payload.title, payload.description)
    except (LookupError, ValueError) as exc: raise service_error(NotFound(str(exc)) if isinstance(exc, LookupError) else InvalidInput(str(exc))) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/features', response_model=list[FeatureResponse])
def list_features(workspace_id: str, project_id: str, search: str | None = None, status_filter: str | None = Query(default=None, alias='status'), priority: str | None = None, epic_id: str | None = None, planning: PlanningService = Depends(planning_service)) -> list[dict[str, Any]]:
    try: return planning.list_features(workspace_id, project_id, search, status_filter, priority, epic_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/features', response_model=FeatureResponse, status_code=201)
def create_feature(workspace_id: str, project_id: str, payload: FeatureCreate, planning: PlanningService = Depends(planning_service)) -> dict[str, Any]:
    try: return planning.create_feature(workspace_id, project_id, payload.model_dump())
    except (LookupError, ValueError) as exc: raise service_error(NotFound(str(exc)) if isinstance(exc, LookupError) else InvalidInput(str(exc))) from exc


@router.get("/workspaces", response_model=list[WorkspaceResponse])
def list_workspaces(organization: OrganizationService = Depends(service)) -> list[dict[str, Any]]:
    return organization.list_workspaces()


@router.post("/workspaces", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
def create_workspace(payload: WorkspaceCreate, organization: OrganizationService = Depends(service)) -> dict[str, Any]:
    try:
        return organization.create_workspace(payload.name, payload.description)
    except (DuplicateName, InvalidInput) as exc:
        raise service_error(exc) from exc


@router.get("/workspaces/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(workspace_id: str, organization: OrganizationService = Depends(service)) -> dict[str, Any]:
    try:
        return organization.workspace(workspace_id)
    except NotFound as exc:
        raise service_error(exc) from exc


@router.patch("/workspaces/{workspace_id}", response_model=WorkspaceResponse)
def update_workspace(workspace_id: str, payload: WorkspaceUpdate, organization: OrganizationService = Depends(service)) -> dict[str, Any]:
    try:
        return organization.update_workspace(workspace_id, payload.model_dump(exclude_unset=True))
    except (DuplicateName, InvalidInput, NotFound) as exc:
        raise service_error(exc) from exc


@router.get("/workspaces/{workspace_id}/projects", response_model=list[ProjectResponse])
def list_projects(
    workspace_id: str,
    search: str | None = Query(default=None, max_length=120),
    status_filter: str = Query(default="active", alias="status"),
    organization: OrganizationService = Depends(service),
) -> list[dict[str, Any]]:
    try:
        return organization.projects(workspace_id, search, status_filter)
    except (InvalidInput, NotFound) as exc:
        raise service_error(exc) from exc


@router.post("/workspaces/{workspace_id}/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(workspace_id: str, payload: ProjectCreate, organization: OrganizationService = Depends(service)) -> dict[str, Any]:
    try:
        return organization.create_project(workspace_id, payload.name, payload.description)
    except (DuplicateName, InvalidInput, NotFound) as exc:
        raise service_error(exc) from exc


@router.get("/workspaces/{workspace_id}/projects/{project_id}", response_model=ProjectResponse)
def get_project(workspace_id: str, project_id: str, organization: OrganizationService = Depends(service)) -> dict[str, Any]:
    try:
        return organization.project(workspace_id, project_id)
    except NotFound as exc:
        raise service_error(exc) from exc


@router.patch("/workspaces/{workspace_id}/projects/{project_id}", response_model=ProjectResponse)
def update_project(workspace_id: str, project_id: str, payload: ProjectUpdate, organization: OrganizationService = Depends(service)) -> dict[str, Any]:
    try:
        return organization.update_project(workspace_id, project_id, payload.model_dump(exclude_unset=True))
    except (DuplicateName, InvalidInput, NotFound) as exc:
        raise service_error(exc) from exc


@router.post("/workspaces/{workspace_id}/projects/{project_id}/archive", response_model=ProjectResponse)
def archive_project(workspace_id: str, project_id: str, organization: OrganizationService = Depends(service)) -> dict[str, Any]:
    try:
        return organization.set_project_status(workspace_id, project_id, "archived")
    except (InvalidInput, NotFound) as exc:
        raise service_error(exc) from exc


@router.post("/workspaces/{workspace_id}/projects/{project_id}/restore", response_model=ProjectResponse)
def restore_project(workspace_id: str, project_id: str, organization: OrganizationService = Depends(service)) -> dict[str, Any]:
    try:
        return organization.set_project_status(workspace_id, project_id, "active")
    except (InvalidInput, NotFound) as exc:
        raise service_error(exc) from exc

@router.patch('/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/acceptance-criteria/{criterion_id}', response_model=CriterionResponse)
def update_criterion(workspace_id: str, project_id: str, feature_id: str, criterion_id: str, payload: CriterionUpdate, planning: PlanningService = Depends(planning_service)) -> dict[str, Any]:
    try: return planning.update_criterion(workspace_id, project_id, feature_id, criterion_id, payload.model_dump(exclude_unset=True))
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/tasks', response_model=list[TaskResponse])
def list_tasks(workspace_id: str, project_id: str, feature_id: str, planning: PlanningService = Depends(planning_service)) -> list[dict[str, Any]]:
    try: return planning.tasks(workspace_id, project_id, feature_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/tasks', response_model=TaskResponse, status_code=201)
def create_task(workspace_id: str, project_id: str, feature_id: str, payload: TaskCreate, planning: PlanningService = Depends(planning_service)) -> dict[str, Any]:
    try: return planning.create_task(workspace_id, project_id, feature_id, payload.model_dump())
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc: raise service_error(InvalidInput(str(exc))) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/dependencies', response_model=list[DependencyResponse])
def list_dependencies(workspace_id: str, project_id: str, planning: PlanningService = Depends(planning_service)) -> list[dict[str, Any]]:
    try: return planning.dependencies(workspace_id, project_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/dependencies', response_model=DependencyResponse, status_code=201)
def create_dependency(workspace_id: str, project_id: str, payload: DependencyCreate, planning: PlanningService = Depends(planning_service)) -> dict[str, Any]:
    try: return planning.create_dependency(workspace_id, project_id, payload.model_dump())
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc: raise service_error(InvalidInput(str(exc))) from exc
    except sqlite3.IntegrityError as exc: raise service_error(DuplicateName('Dependency already exists')) from exc

def knowledge_service(connection: sqlite3.Connection = Depends(database)) -> KnowledgeService:
    return KnowledgeService(connection)

def readiness_service(connection: sqlite3.Connection = Depends(database)) -> ReadinessService:
    return ReadinessService(connection)

@router.get('/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/acceptance-criteria', response_model=list[CriterionResponse])
def list_criteria(workspace_id: str, project_id: str, feature_id: str, knowledge: KnowledgeService = Depends(knowledge_service)) -> list[dict[str, Any]]:
    try: return knowledge.criteria(workspace_id, project_id, feature_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/acceptance-criteria', response_model=CriterionResponse, status_code=201)
def create_criterion(workspace_id: str, project_id: str, feature_id: str, payload: CriterionCreate, knowledge: KnowledgeService = Depends(knowledge_service)) -> dict[str, Any]:
    try: return knowledge.create_criterion(workspace_id, project_id, feature_id, payload.description)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc: raise service_error(InvalidInput(str(exc))) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/decisions', response_model=list[DecisionResponse])
def list_decisions(workspace_id: str, project_id: str, knowledge: KnowledgeService = Depends(knowledge_service)) -> list[dict[str, Any]]:
    try: return knowledge.decisions(workspace_id, project_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/decisions', response_model=DecisionResponse, status_code=201)
def create_decision(workspace_id: str, project_id: str, payload: DecisionCreate, knowledge: KnowledgeService = Depends(knowledge_service)) -> dict[str, Any]:
    try: return knowledge.create_decision(workspace_id, project_id, payload.model_dump())
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc: raise service_error(InvalidInput(str(exc))) from exc

@router.patch('/workspaces/{workspace_id}/projects/{project_id}/decisions/{decision_id}', response_model=DecisionResponse)
def update_decision(workspace_id: str, project_id: str, decision_id: str, payload: DecisionUpdate, knowledge: KnowledgeService = Depends(knowledge_service)) -> dict[str, Any]:
    try: return knowledge.update_decision(workspace_id, project_id, decision_id, payload.model_dump(exclude_unset=True))
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/decisions/{decision_id}/accept', response_model=DecisionResponse)
def accept_decision(workspace_id: str, project_id: str, decision_id: str, knowledge: KnowledgeService = Depends(knowledge_service)) -> dict[str, Any]:
    try: return knowledge.accept_decision(workspace_id, project_id, decision_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/decisions/{decision_id}/features/{feature_id}', status_code=204)
def link_decision(workspace_id: str, project_id: str, decision_id: str, feature_id: str, knowledge: KnowledgeService = Depends(knowledge_service)) -> None:
    try: knowledge.link_decision(workspace_id, project_id, decision_id, feature_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except sqlite3.IntegrityError as exc: raise service_error(DuplicateName('Decision already linked')) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/invariants', response_model=InvariantResponse, status_code=201)
def create_invariant(workspace_id: str, project_id: str, payload: InvariantCreate, knowledge: KnowledgeService = Depends(knowledge_service)) -> dict[str, Any]:
    try: return knowledge.create_invariant(workspace_id, project_id, payload.model_dump())
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc: raise service_error(InvalidInput(str(exc))) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/invariants', response_model=list[InvariantResponse])
def list_invariants(workspace_id: str, project_id: str, knowledge: KnowledgeService = Depends(knowledge_service)) -> list[dict[str, Any]]:
    try: return knowledge.invariants(workspace_id, project_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.patch('/workspaces/{workspace_id}/projects/{project_id}/invariants/{invariant_id}', response_model=InvariantResponse)
def update_invariant(workspace_id: str, project_id: str, invariant_id: str, payload: InvariantUpdate, knowledge: KnowledgeService = Depends(knowledge_service)) -> dict[str, Any]:
    try: return knowledge.update_invariant(workspace_id, project_id, invariant_id, payload.model_dump(exclude_unset=True))
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/invariants/{invariant_id}/acknowledge', response_model=AcknowledgeResponse)
def acknowledge_invariant(workspace_id: str, project_id: str, feature_id: str, invariant_id: str, payload: AcknowledgeRequest, knowledge: KnowledgeService = Depends(knowledge_service)) -> dict[str, Any]:
    try: return knowledge.acknowledge(workspace_id, project_id, feature_id, invariant_id, payload.expected_revision)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except RuntimeError as exc: raise service_error(exc) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/readiness/preview')
def preview_readiness(workspace_id: str, project_id: str, feature_id: str, readiness: ReadinessService = Depends(readiness_service)) -> dict[str, Any]:
    try: return readiness.evaluate(workspace_id, project_id, feature_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/readiness/evaluations', status_code=201)
def save_readiness(workspace_id: str, project_id: str, feature_id: str, readiness: ReadinessService = Depends(readiness_service)) -> dict[str, Any]:
    try:
        saved = readiness.save(workspace_id, project_id, feature_id)
        return {**saved, 'evaluation_id': saved['id'], 'stale': False}
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc: raise service_error(InvalidInput(str(exc))) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/readiness/evaluations')
def list_readiness(workspace_id: str, project_id: str, feature_id: str, readiness: ReadinessService = Depends(readiness_service)) -> list[dict[str, Any]]:
    try: return readiness.history(workspace_id, project_id, feature_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
