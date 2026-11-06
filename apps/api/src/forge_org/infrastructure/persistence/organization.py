"""Compatibility facade for the organization persistence contract."""

import sqlite3
from collections.abc import Callable
from functools import wraps
from typing import Any, ParamSpec, TypeVar

from forge_org.domain.errors import DuplicateRecord

from .common import row_dict
from .organization_planning import OrganizationPlanningPersistence

__all__ = ['OrganizationRepository', 'row_dict']

_P = ParamSpec('_P')
_R = TypeVar('_R')


def _unique_as_duplicate(method: Callable[_P, _R]) -> Callable[_P, _R]:
    """Translate SQLite uniqueness failures into the framework-free domain error."""

    @wraps(method)
    def wrapper(*args: _P.args, **kwargs: _P.kwargs) -> _R:
        try:
            return method(*args, **kwargs)
        except sqlite3.IntegrityError as exc:
            raise DuplicateRecord(str(exc)) from exc

    return wrapper


class OrganizationRepository(OrganizationPlanningPersistence):
    """Stable repository facade composed from cohesive persistence groups."""

    def __init__(self, connection: sqlite3.Connection) -> None:
        self.connection = connection

    @_unique_as_duplicate
    def create_workspace(self, name: str, description: str | None) -> dict[str, Any]:
        return super().create_workspace(name, description)

    @_unique_as_duplicate
    def update_workspace(self, workspace_id: str, values: dict[str, Any]) -> dict[str, Any] | None:
        return super().update_workspace(workspace_id, values)

    @_unique_as_duplicate
    def create_project(
        self, workspace_id: str, name: str, description: str | None
    ) -> dict[str, Any]:
        return super().create_project(workspace_id, name, description)

    @_unique_as_duplicate
    def update_project(
        self, workspace_id: str, project_id: str, values: dict[str, Any]
    ) -> dict[str, Any] | None:
        return super().update_project(workspace_id, project_id, values)
