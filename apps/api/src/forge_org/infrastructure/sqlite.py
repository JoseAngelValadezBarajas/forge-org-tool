"""Compatibility exports for the former SQLite persistence module.

New application code should import repository implementations from
``forge_org.infrastructure.persistence``. This module remains for existing
integrations that still use the historical import path.
"""

from .persistence.organization import OrganizationRepository, row_dict

__all__ = ['OrganizationRepository', 'row_dict']
