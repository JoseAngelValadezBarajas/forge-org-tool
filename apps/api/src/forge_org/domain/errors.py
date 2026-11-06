"""Framework-independent error vocabulary shared by every layer."""


class DuplicateRecord(Exception):
    """A uniqueness rule rejected a write. Persistence adapters raise this."""
