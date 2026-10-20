# ruff: noqa: B008
import sqlite3
from collections.abc import Iterator
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import PlainTextResponse

from forge_org.api.schemas import (
    AcknowledgeRequest,
    AcknowledgeResponse,
    CandidateCreate,
    CandidateFreezeRequest,
    CandidateHistoryResponse,
    CandidateResponse,
    CandidateUpdate,
    ContextPackageResponse,
    CriterionCreate,
    CriterionResponse,
    CriterionUpdate,
    DecisionCreate,
    DecisionResponse,
    DecisionRevisionResponse,
    DecisionUpdate,
    DependencyCreate,
    DependencyResponse,
    EpicCreate,
    EpicResponse,
    EpicUpdate,
    EvidenceCreate,
    EvidenceResponse,
    FeatureCreate,
    FeatureResponse,
    FeatureUpdate,
    GateEvaluationResponse,
    HandoffAcknowledgementResponse,
    HandoffAckRequest,
    HandoffCreate,
    HandoffResponse,
    HandoffRevisionResponse,
    HandoffUpdate,
    HandoffVersionRequest,
    ImportCommitRequest,
    ImportPreviewResponse,
    ImportResponse,
    InvariantCreate,
    InvariantResponse,
    InvariantRevisionResponse,
    InvariantUpdate,
    ManifestResponse,
    ManifestSaveRequest,
    ObservationResponse,
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
    RepositoryCreate,
    RepositoryLinkCreate,
    RepositoryResponse,
    RunCreate,
    RunEventCreate,
    RunEventResponse,
    RunResponse,
    RunStatusUpdate,
    TaskCreate,
    TaskResponse,
    TaskUpdate,
    VerificationRequest,
    VerificationResponse,
    VerificationRuleResponse,
    WorkspaceCreate,
    WorkspaceResponse,
    WorkspaceUpdate,
)
from forge_org.application.context_packages import ContextPackageService
from forge_org.application.delivery import DeliveryService
from forge_org.application.knowledge import KnowledgeService
from forge_org.application.organization import (
    DuplicateName,
    InvalidInput,
    NotFound,
    OrganizationService,
)
from forge_org.application.planning import PlanningService
from forge_org.application.readiness import ReadinessService
from forge_org.application.repositories import RepositoryService
from forge_org.application.runs import HandoffService, RunService
from forge_org.application.transfer import ProjectTransferService
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

def repository_service(connection: sqlite3.Connection = Depends(database)) -> RepositoryService:
    return RepositoryService(connection)

def context_service(connection: sqlite3.Connection = Depends(database)) -> ContextPackageService:
    return ContextPackageService(connection)

def run_service(connection: sqlite3.Connection = Depends(database)) -> RunService:
    return RunService(connection)

def handoff_service(connection: sqlite3.Connection = Depends(database)) -> HandoffService:
    return HandoffService(connection)

def delivery_service(connection: sqlite3.Connection = Depends(database)) -> DeliveryService:
    return DeliveryService(connection)

def transfer_service(connection: sqlite3.Connection = Depends(database)) -> ProjectTransferService:
    return ProjectTransferService(connection)

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

@router.patch('/workspaces/{workspace_id}/projects/{project_id}/epics/{epic_id}', response_model=EpicResponse)
def update_epic(workspace_id: str, project_id: str, epic_id: str, payload: EpicUpdate, planning: PlanningService = Depends(planning_service)) -> dict[str, Any]:
    try: return planning.update_epic(workspace_id, project_id, epic_id, payload.model_dump(exclude_unset=True))
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc: raise service_error(InvalidInput(str(exc))) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/features', response_model=list[FeatureResponse])
def list_features(workspace_id: str, project_id: str, search: str | None = None, status_filter: str | None = Query(default=None, alias='status'), priority: str | None = None, epic_id: str | None = None, planning: PlanningService = Depends(planning_service)) -> list[dict[str, Any]]:
    try: return planning.list_features(workspace_id, project_id, search, status_filter, priority, epic_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/features', response_model=FeatureResponse, status_code=201)
def create_feature(workspace_id: str, project_id: str, payload: FeatureCreate, planning: PlanningService = Depends(planning_service)) -> dict[str, Any]:
    try: return planning.create_feature(workspace_id, project_id, payload.model_dump())
    except (LookupError, ValueError) as exc: raise service_error(NotFound(str(exc)) if isinstance(exc, LookupError) else InvalidInput(str(exc))) from exc

@router.patch('/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}', response_model=FeatureResponse)
def update_feature(workspace_id: str, project_id: str, feature_id: str, payload: FeatureUpdate, planning: PlanningService = Depends(planning_service)) -> dict[str, Any]:
    try: return planning.update_feature(workspace_id, project_id, feature_id, payload.model_dump(exclude_unset=True))
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc: raise service_error(InvalidInput(str(exc))) from exc


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

@router.patch('/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/tasks/{task_id}', response_model=TaskResponse)
def update_task(workspace_id: str, project_id: str, feature_id: str, task_id: str, payload: TaskUpdate, planning: PlanningService = Depends(planning_service)) -> dict[str, Any]:
    try: return planning.update_task(workspace_id, project_id, feature_id, task_id, payload.model_dump(exclude_unset=True))
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc: raise service_error(InvalidInput(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/tasks/reorder', response_model=list[TaskResponse])
def reorder_tasks(workspace_id: str, project_id: str, feature_id: str, payload: dict[str, list[str]], planning: PlanningService = Depends(planning_service)) -> list[dict[str, Any]]:
    try: return planning.reorder_tasks(workspace_id, project_id, feature_id, payload.get('ids', []))
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

@router.delete('/workspaces/{workspace_id}/projects/{project_id}/dependencies/{dependency_id}', status_code=204)
def delete_dependency(workspace_id: str, project_id: str, dependency_id: str, planning: PlanningService = Depends(planning_service)) -> None:
    try: planning.delete_dependency(workspace_id, project_id, dependency_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

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

@router.get('/workspaces/{workspace_id}/projects/{project_id}/decisions/{decision_id}/revisions', response_model=list[DecisionRevisionResponse])
def decision_revisions(workspace_id: str, project_id: str, decision_id: str, knowledge: KnowledgeService = Depends(knowledge_service)) -> list[dict[str, Any]]:
    try: return knowledge.decision_revisions(workspace_id, project_id, decision_id)
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
def list_invariants(workspace_id: str, project_id: str, feature_id: str | None = None, knowledge: KnowledgeService = Depends(knowledge_service)) -> list[dict[str, Any]]:
    try: return knowledge.invariants(workspace_id, project_id, feature_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.patch('/workspaces/{workspace_id}/projects/{project_id}/invariants/{invariant_id}', response_model=InvariantResponse)
def update_invariant(workspace_id: str, project_id: str, invariant_id: str, payload: InvariantUpdate, knowledge: KnowledgeService = Depends(knowledge_service)) -> dict[str, Any]:
    try: return knowledge.update_invariant(workspace_id, project_id, invariant_id, payload.model_dump(exclude_unset=True))
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/invariants/{invariant_id}/revisions', response_model=list[InvariantRevisionResponse])
def invariant_revisions(workspace_id: str, project_id: str, invariant_id: str, knowledge: KnowledgeService = Depends(knowledge_service)) -> list[dict[str, Any]]:
    try: return knowledge.invariant_revisions(workspace_id, project_id, invariant_id)
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

@router.get('/workspaces/{workspace_id}/projects/{project_id}/repositories', response_model=list[RepositoryResponse])
def list_repositories(workspace_id: str, project_id: str, repositories: RepositoryService = Depends(repository_service)) -> list[dict[str, Any]]:
    try: return repositories.repositories(workspace_id, project_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/repositories', response_model=RepositoryResponse, status_code=201)
def connect_repository(workspace_id: str, project_id: str, payload: RepositoryCreate, repositories: RepositoryService = Depends(repository_service)) -> dict[str, Any]:
    try: return repositories.connect(workspace_id, project_id, payload.root_path)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc: raise service_error(InvalidInput(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/repositories/{repository_id}/observe', response_model=ObservationResponse, status_code=201)
def observe_repository(workspace_id: str, project_id: str, repository_id: str, repositories: RepositoryService = Depends(repository_service)) -> dict[str, Any]:
    try: return repositories.observe(workspace_id, project_id, repository_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc: raise service_error(InvalidInput(str(exc))) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/repositories/{repository_id}/observations', response_model=list[ObservationResponse])
def list_observations(workspace_id: str, project_id: str, repository_id: str, repositories: RepositoryService = Depends(repository_service)) -> list[dict[str, Any]]:
    try: return repositories.observations(workspace_id, project_id, repository_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/repositories/{repository_id}/disconnect', response_model=RepositoryResponse)
def disconnect_repository(workspace_id: str, project_id: str, repository_id: str, repositories: RepositoryService = Depends(repository_service)) -> dict[str, Any]:
    try: return repositories.disconnect(workspace_id, project_id, repository_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/repositories', status_code=201)
def link_feature_repository(workspace_id: str, project_id: str, feature_id: str, payload: RepositoryLinkCreate, repositories: RepositoryService = Depends(repository_service)) -> dict[str, Any]:
    try: return repositories.link_feature(workspace_id, project_id, feature_id, payload.repository_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except sqlite3.IntegrityError as exc: raise service_error(DuplicateName('Repository already linked')) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/repositories', response_model=list[RepositoryResponse])
def list_feature_repositories(workspace_id: str, project_id: str, feature_id: str, repositories: RepositoryService = Depends(repository_service)) -> list[dict[str, Any]]:
    try: return repositories.feature_links(workspace_id, project_id, feature_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.delete('/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/repositories/{repository_id}', status_code=204)
def unlink_feature_repository(workspace_id: str, project_id: str, feature_id: str, repository_id: str, repositories: RepositoryService = Depends(repository_service)) -> None:
    try: repositories.unlink_feature(workspace_id, project_id, feature_id, repository_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/context/preview')
def preview_context(workspace_id: str, project_id: str, feature_id: str, context: ContextPackageService = Depends(context_service)) -> dict[str, Any]:
    try: return context.preview(workspace_id, project_id, feature_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/context/packages', response_model=list[ContextPackageResponse])
def list_context_packages(workspace_id: str, project_id: str, feature_id: str, context: ContextPackageService = Depends(context_service)) -> list[dict[str, Any]]:
    try: return context.list(workspace_id, project_id, feature_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/context/packages', response_model=ContextPackageResponse, status_code=201)
def save_context_package(workspace_id: str, project_id: str, feature_id: str, context: ContextPackageService = Depends(context_service)) -> dict[str, Any]:
    try: return context.save(workspace_id, project_id, feature_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc: raise service_error(InvalidInput(str(exc))) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/context/packages/{package_id}', response_model=ContextPackageResponse)
def get_context_package(workspace_id: str, project_id: str, feature_id: str, package_id: str, context: ContextPackageService = Depends(context_service)) -> dict[str, Any]:
    try: return context.get(workspace_id, project_id, feature_id, package_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/features/{feature_id}/context/packages/{package_id}/download')
def download_context_package(workspace_id: str, project_id: str, feature_id: str, package_id: str, format: str = Query(default='json'), context: ContextPackageService = Depends(context_service)) -> Response:
    if format not in {'json', 'markdown'}: raise service_error(InvalidInput('Format must be json or markdown'))
    try: package = context.get(workspace_id, project_id, feature_id, package_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    if format == 'markdown': return PlainTextResponse(package['markdown'], media_type='text/markdown')
    return Response(content=package['payload_json'], media_type='application/json')

@router.get('/workspaces/{workspace_id}/projects/{project_id}/runs', response_model=list[RunResponse])
def list_runs(workspace_id: str, project_id: str, feature_id: str | None = None, status_filter: str | None = Query(default=None, alias='status'), search: str | None = Query(default=None, max_length=160), runs: RunService = Depends(run_service)) -> list[dict[str, Any]]:
    try: return runs.list_runs(workspace_id, project_id, feature_id, status_filter, search)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/runs', response_model=RunResponse, status_code=201)
def create_run(workspace_id: str, project_id: str, payload: RunCreate, runs: RunService = Depends(run_service)) -> dict[str, Any]:
    try: return runs.create(workspace_id, project_id, payload.model_dump())
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc: raise service_error(InvalidInput(str(exc))) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/runs/{run_id}', response_model=RunResponse)
def get_run(workspace_id: str, project_id: str, run_id: str, runs: RunService = Depends(run_service)) -> dict[str, Any]:
    try: return runs.get(workspace_id, project_id, run_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/runs/{run_id}/status', response_model=RunResponse)
def update_run_status(workspace_id: str, project_id: str, run_id: str, payload: RunStatusUpdate, runs: RunService = Depends(run_service)) -> dict[str, Any]:
    try: return runs.change_status(workspace_id, project_id, run_id, payload.status, payload.expected_version)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc: raise service_error(InvalidInput(str(exc))) from exc
    except RuntimeError as exc: raise service_error(exc) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/runs/{run_id}/events', response_model=list[RunEventResponse])
def list_run_events(workspace_id: str, project_id: str, run_id: str, runs: RunService = Depends(run_service)) -> list[dict[str, Any]]:
    try: return runs.events(workspace_id, project_id, run_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/runs/{run_id}/events', response_model=RunEventResponse, status_code=201)
def create_run_event(workspace_id: str, project_id: str, run_id: str, payload: RunEventCreate, runs: RunService = Depends(run_service)) -> dict[str, Any]:
    try: return runs.add_event(workspace_id, project_id, run_id, payload.model_dump())
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc: raise service_error(InvalidInput(str(exc))) from exc
    except RuntimeError as exc: raise service_error(exc) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/runs/{run_id}/handoffs', response_model=HandoffResponse, status_code=201)
def create_handoff(workspace_id: str, project_id: str, run_id: str, payload: HandoffCreate, handoffs: HandoffService = Depends(handoff_service)) -> dict[str, Any]:
    try: return handoffs.create(workspace_id, project_id, {**payload.model_dump(), 'run_id': run_id})
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc: raise service_error(InvalidInput(str(exc))) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/handoffs', response_model=list[HandoffResponse])
def list_handoffs(workspace_id: str, project_id: str, handoffs: HandoffService = Depends(handoff_service)) -> list[dict[str, Any]]:
    try: return handoffs.list_handoffs(workspace_id, project_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.patch('/workspaces/{workspace_id}/projects/{project_id}/handoffs/{handoff_id}', response_model=HandoffResponse)
def update_handoff(workspace_id: str, project_id: str, handoff_id: str, payload: HandoffUpdate, handoffs: HandoffService = Depends(handoff_service)) -> dict[str, Any]:
    try: return handoffs.update(workspace_id, project_id, handoff_id, payload.expected_version, payload.model_dump(exclude={'expected_version'}, exclude_unset=True))
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc: raise service_error(InvalidInput(str(exc))) from exc
    except RuntimeError as exc: raise service_error(exc) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/handoffs/{handoff_id}/ready', response_model=HandoffResponse)
def ready_handoff(workspace_id: str, project_id: str, handoff_id: str, payload: HandoffVersionRequest, handoffs: HandoffService = Depends(handoff_service)) -> dict[str, Any]:
    try: return handoffs.ready(workspace_id, project_id, handoff_id, payload.expected_version)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc: raise service_error(InvalidInput(str(exc))) from exc
    except RuntimeError as exc: raise service_error(exc) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/handoffs/{handoff_id}/acknowledge', response_model=HandoffAcknowledgementResponse)
def acknowledge_handoff(workspace_id: str, project_id: str, handoff_id: str, payload: HandoffAckRequest, handoffs: HandoffService = Depends(handoff_service)) -> dict[str, Any]:
    try: return handoffs.acknowledge(workspace_id, project_id, handoff_id, payload.expected_revision, payload.acknowledged_by)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc: raise service_error(InvalidInput(str(exc))) from exc
    except RuntimeError as exc: raise service_error(exc) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/handoffs/{handoff_id}/revisions', response_model=list[HandoffRevisionResponse])
def list_handoff_revisions(workspace_id: str, project_id: str, handoff_id: str, handoffs: HandoffService = Depends(handoff_service)) -> list[dict[str, Any]]:
    try: return handoffs.revisions(workspace_id, project_id, handoff_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/handoffs/{handoff_id}/revisions/{revision}/download')
def download_handoff_revision(workspace_id: str, project_id: str, handoff_id: str, revision: int, format: str = Query(default='json'), handoffs: HandoffService = Depends(handoff_service)) -> Response:
    if format not in {'json', 'markdown'}: raise service_error(InvalidInput('Format must be json or markdown'))
    try: item = handoffs.get_revision(workspace_id, project_id, handoff_id, revision)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    if format == 'markdown': return PlainTextResponse(item['markdown'], media_type='text/markdown')
    return Response(content=item['payload_json'], media_type='application/json')

@router.get('/workspaces/{workspace_id}/projects/{project_id}/evidence', response_model=list[EvidenceResponse])
def list_evidence(workspace_id: str, project_id: str, search: str | None = Query(default=None, max_length=200), provenance: str | None = None, status_filter: str | None = Query(default=None, alias='status'), delivery: DeliveryService = Depends(delivery_service)) -> list[dict[str, Any]]:
    try: return delivery.evidence_list(workspace_id, project_id, search, provenance, status_filter)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/evidence', response_model=EvidenceResponse, status_code=201)
def create_evidence(workspace_id: str, project_id: str, payload: EvidenceCreate, delivery: DeliveryService = Depends(delivery_service)) -> dict[str, Any]:
    try: return delivery.evidence_create(workspace_id, project_id, payload.model_dump())
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc: raise service_error(InvalidInput(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/evidence/{evidence_id}/invalidate', response_model=EvidenceResponse)
def invalidate_evidence(workspace_id: str, project_id: str, evidence_id: str, delivery: DeliveryService = Depends(delivery_service)) -> dict[str, Any]:
    try: return delivery.evidence_invalidate(workspace_id, project_id, evidence_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/evidence/{evidence_id}', response_model=EvidenceResponse)
def get_evidence(workspace_id: str, project_id: str, evidence_id: str, delivery: DeliveryService = Depends(delivery_service)) -> dict[str, Any]:
    try: return delivery.evidence_get(workspace_id, project_id, evidence_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/verifications/rules', response_model=list[VerificationRuleResponse])
def list_verification_rules(workspace_id: str, project_id: str, delivery: DeliveryService = Depends(delivery_service)) -> list[dict[str, str]]:
    try: return delivery.verification_rules(workspace_id, project_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/verifications', response_model=list[VerificationResponse])
def list_verifications(workspace_id: str, project_id: str, delivery: DeliveryService = Depends(delivery_service)) -> list[dict[str, Any]]:
    try: return delivery.verification_list(workspace_id, project_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/verifications/preview', response_model=VerificationResponse)
def preview_verification(workspace_id: str, project_id: str, payload: VerificationRequest, delivery: DeliveryService = Depends(delivery_service)) -> dict[str, Any]:
    try: return delivery.verification_preview(workspace_id, project_id, payload.rule_id, payload.candidate_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc: raise service_error(InvalidInput(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/verifications/evaluate', response_model=VerificationResponse, status_code=201)
def evaluate_verification(workspace_id: str, project_id: str, payload: VerificationRequest, delivery: DeliveryService = Depends(delivery_service)) -> dict[str, Any]:
    try: return delivery.verification_evaluate(workspace_id, project_id, payload.rule_id, payload.candidate_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc: raise service_error(InvalidInput(str(exc))) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/verifications/{evaluation_id}', response_model=VerificationResponse)
def get_verification(workspace_id: str, project_id: str, evaluation_id: str, delivery: DeliveryService = Depends(delivery_service)) -> dict[str, Any]:
    try: return delivery.verification_get(workspace_id, project_id, evaluation_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/release-candidates', response_model=list[CandidateResponse])
def list_candidates(workspace_id: str, project_id: str, delivery: DeliveryService = Depends(delivery_service)) -> list[dict[str, Any]]:
    try: return delivery.candidates(workspace_id, project_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/release-candidates', response_model=CandidateResponse, status_code=201)
def create_candidate(workspace_id: str, project_id: str, payload: CandidateCreate, delivery: DeliveryService = Depends(delivery_service)) -> dict[str, Any]:
    try: return delivery.candidate_create(workspace_id, project_id, payload.model_dump())
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc: raise service_error(InvalidInput(str(exc))) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/release-candidates/{candidate_id}', response_model=CandidateResponse)
def get_candidate(workspace_id: str, project_id: str, candidate_id: str, delivery: DeliveryService = Depends(delivery_service)) -> dict[str, Any]:
    try: return delivery.candidate_get(workspace_id, project_id, candidate_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.patch('/workspaces/{workspace_id}/projects/{project_id}/release-candidates/{candidate_id}', response_model=CandidateResponse)
def update_candidate(workspace_id: str, project_id: str, candidate_id: str, payload: CandidateUpdate, delivery: DeliveryService = Depends(delivery_service)) -> dict[str, Any]:
    try:
        return delivery.candidate_update(workspace_id, project_id, candidate_id, payload.model_dump(exclude_unset=True))
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc: raise service_error(InvalidInput(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/release-candidates/{candidate_id}/freeze', response_model=CandidateResponse)
def freeze_candidate(workspace_id: str, project_id: str, candidate_id: str, payload: CandidateFreezeRequest, delivery: DeliveryService = Depends(delivery_service)) -> dict[str, Any]:
    try: return delivery.freeze(workspace_id, project_id, candidate_id, payload.expected_revision)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc: raise service_error(InvalidInput(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/release-candidates/{candidate_id}/gates/preview', response_model=GateEvaluationResponse)
def preview_gates(workspace_id: str, project_id: str, candidate_id: str, delivery: DeliveryService = Depends(delivery_service)) -> dict[str, Any]:
    try: return delivery.gate(workspace_id, project_id, candidate_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/release-candidates/{candidate_id}/revisions', response_model=list[CandidateHistoryResponse])
def list_candidate_revisions(workspace_id: str, project_id: str, candidate_id: str, delivery: DeliveryService = Depends(delivery_service)) -> list[dict[str, Any]]:
    try: return delivery.candidate_history(workspace_id, project_id, candidate_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/release-candidates/{candidate_id}/gates', response_model=list[GateEvaluationResponse])
def list_candidate_gates(workspace_id: str, project_id: str, candidate_id: str, delivery: DeliveryService = Depends(delivery_service)) -> list[dict[str, Any]]:
    try: return delivery.candidate_gate_history(workspace_id, project_id, candidate_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/release-candidates/{candidate_id}/manifest', response_model=ManifestResponse)
def get_manifest(workspace_id: str, project_id: str, candidate_id: str, manifest_id: str | None = Query(default=None), delivery: DeliveryService = Depends(delivery_service)) -> dict[str, Any]:
    try: return delivery.manifest_get(workspace_id, project_id, candidate_id, manifest_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/{project_id}/release-candidates/{candidate_id}/manifest', response_model=ManifestResponse, status_code=201)
def save_manifest(workspace_id: str, project_id: str, candidate_id: str, payload: ManifestSaveRequest, delivery: DeliveryService = Depends(delivery_service)) -> dict[str, Any]:
    try: return delivery.manifest_save(workspace_id, project_id, candidate_id, payload.gate_evaluation_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except ValueError as exc: raise service_error(InvalidInput(str(exc))) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/release-candidates/{candidate_id}/manifest/download')
def download_manifest(workspace_id: str, project_id: str, candidate_id: str, format: str = Query(default='json'), manifest_id: str | None = Query(default=None), delivery: DeliveryService = Depends(delivery_service)) -> Response:
    if format not in {'json', 'markdown'}: raise service_error(InvalidInput('Format must be json or markdown'))
    try: item = delivery.manifest_get(workspace_id, project_id, candidate_id, manifest_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    if format == 'markdown': return PlainTextResponse(item['markdown'], media_type='text/markdown')
    return Response(content=item['payload_json'], media_type='application/json')

@router.post('/workspaces/{workspace_id}/projects/{project_id}/release-candidates/{candidate_id}/gates/evaluate', response_model=GateEvaluationResponse, status_code=201)
def evaluate_gates(workspace_id: str, project_id: str, candidate_id: str, delivery: DeliveryService = Depends(delivery_service)) -> dict[str, Any]:
    try: return delivery.gate(workspace_id, project_id, candidate_id, save=True)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/import/preview', response_model=ImportPreviewResponse)
def preview_import(workspace_id: str, payload: dict[str, Any], transfer: ProjectTransferService = Depends(transfer_service)) -> dict[str, Any]:
    try: return transfer.preview(workspace_id, payload)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except (ValueError, TypeError) as exc: raise service_error(InvalidInput(str(exc))) from exc

@router.post('/workspaces/{workspace_id}/projects/import', response_model=ImportResponse, status_code=201)
def import_project(workspace_id: str, payload: ImportCommitRequest, transfer: ProjectTransferService = Depends(transfer_service)) -> dict[str, Any]:
    try:
        result = transfer.import_project(workspace_id, payload.document, payload.expected_fingerprint)
        return {'schema_version': 'forge-project-import-v1', 'workspace_id': workspace_id, **result}
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
    except (ValueError, TypeError) as exc: raise service_error(InvalidInput(str(exc))) from exc
    except RuntimeError as exc: raise service_error(exc) from exc
    except sqlite3.IntegrityError as exc: raise service_error(DuplicateName('Project name already exists in this workspace')) from exc

@router.get('/workspaces/{workspace_id}/projects/{project_id}/export')
def export_project(workspace_id: str, project_id: str, transfer: ProjectTransferService = Depends(transfer_service)) -> dict[str, Any]:
    try: return transfer.export_project(workspace_id, project_id)
    except LookupError as exc: raise service_error(NotFound(str(exc))) from exc
