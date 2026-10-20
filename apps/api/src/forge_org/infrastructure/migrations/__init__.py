"""Versioned database migrations for the local SQLite store."""

from .v0002_metadata import upgrade as upgrade_metadata

__all__ = ["upgrade_metadata"]
