# ruff: noqa: B008
"""FastAPI dependency providers shared by the bounded API capabilities."""

import sqlite3
from collections.abc import Iterator

from fastapi import Depends, HTTPException

from forge_org.application.attachments import BugAttachmentService
from forge_org.application.knowledge import KnowledgeService
from forge_org.application.organization import (
    DuplicateName,
    InvalidInput,
    NotFound,
    OrganizationService,
)
from forge_org.application.planning import PlanningService
from forge_org.application.ports import PlanningStore
from forge_org.application.project_package import ProjectPackageService
from forge_org.application.transfer import ProjectTransferService
from forge_org.infrastructure.connection import connect, database_path
from forge_org.infrastructure.persistence import OrganizationRepository


def database() -> Iterator[sqlite3.Connection]:
    connection = connect()
    try:
        yield connection
    finally:
        connection.close()


def planning_store(connection: sqlite3.Connection = Depends(database)) -> PlanningStore:
    return OrganizationRepository(connection)


def service(store: PlanningStore = Depends(planning_store)) -> OrganizationService:
    return OrganizationService(store, database_path().parent / 'bug-attachments')


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


def planning_service(store: PlanningStore = Depends(planning_store)) -> PlanningService:
    return PlanningService(store)


def transfer_service(connection: sqlite3.Connection = Depends(database)) -> ProjectTransferService:
    return ProjectTransferService(connection, database_path().parent / 'bug-attachments')


def project_package_service(
    transfer: ProjectTransferService = Depends(transfer_service),
) -> ProjectPackageService:
    return ProjectPackageService(transfer, database_path().parent / 'bug-attachments')


def knowledge_service(store: PlanningStore = Depends(planning_store)) -> KnowledgeService:
    return KnowledgeService(store)


def bug_attachment_service(
    connection: sqlite3.Connection = Depends(database),
) -> BugAttachmentService:
    return BugAttachmentService(connection, database_path().parent / 'bug-attachments')
