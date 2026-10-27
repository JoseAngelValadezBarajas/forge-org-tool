# ruff: noqa: B008
"""FastAPI dependency providers shared by the bounded API capabilities."""

import sqlite3
from collections.abc import Iterator

from fastapi import Depends, HTTPException

from forge_org.application.attachments import BugAttachmentService
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
from forge_org.application.project_package import ProjectPackageService
from forge_org.application.readiness import ReadinessService
from forge_org.application.repositories import RepositoryService
from forge_org.application.runs import HandoffService, RunService
from forge_org.application.transfer import ProjectTransferService
from forge_org.infrastructure.connection import connect, database_path


def database() -> Iterator[sqlite3.Connection]:
    connection = connect()
    try:
        yield connection
    finally:
        connection.close()


def service(connection: sqlite3.Connection = Depends(database)) -> OrganizationService:
    return OrganizationService(connection, database_path().parent / 'bug-attachments')


def service_error(exc: Exception) -> HTTPException:
    if isinstance(exc, NotFound):
        return HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, DuplicateName):
        return HTTPException(status_code=409, detail=str(exc))
    if isinstance(exc, InvalidInput):
        return HTTPException(status_code=422, detail=str(exc))
    if isinstance(exc, RuntimeError):
        return HTTPException(status_code=409, detail=str(exc))
    return HTTPException(status_code=500, detail='Unexpected organization error')


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
    return ProjectTransferService(connection, database_path().parent / 'bug-attachments')


def project_package_service(
    transfer: ProjectTransferService = Depends(transfer_service),
) -> ProjectPackageService:
    return ProjectPackageService(transfer, database_path().parent / 'bug-attachments')


def knowledge_service(connection: sqlite3.Connection = Depends(database)) -> KnowledgeService:
    return KnowledgeService(connection)


def readiness_service(connection: sqlite3.Connection = Depends(database)) -> ReadinessService:
    return ReadinessService(connection)


def bug_attachment_service(
    connection: sqlite3.Connection = Depends(database),
) -> BugAttachmentService:
    return BugAttachmentService(connection, database_path().parent / 'bug-attachments')
