"""Compatibility facade for the organization persistence contract."""

import sqlite3

from .common import row_dict
from .delivery import DeliveryPersistence
from .organization_planning import OrganizationPlanningPersistence
from .repository_context import RepositoryContextPersistence
from .workbench import WorkbenchPersistence

__all__ = ['OrganizationRepository', 'row_dict']


class OrganizationRepository(
    OrganizationPlanningPersistence,
    RepositoryContextPersistence,
    WorkbenchPersistence,
    DeliveryPersistence,
):
    """Stable repository facade composed from cohesive persistence groups."""

    def __init__(self, connection: sqlite3.Connection) -> None:
        self.connection = connection
