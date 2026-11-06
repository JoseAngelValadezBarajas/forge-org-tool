"""Framework-independent error vocabulary shared by every layer.

The API adapter maps these to HTTP statuses in one place (``api/error_handlers.py``).
They subclass the matching built-ins so existing ``except ValueError`` code keeps working.
"""


class NotFound(LookupError):
    """A referenced record does not exist."""


class InvalidInput(ValueError):
    """The request violates a business or validation rule."""


class Conflict(RuntimeError):
    """The request conflicts with current state (stale fingerprint, duplicate, ...)."""


class DuplicateName(Conflict):
    """A uniqueness rule on a human-visible name rejected the request."""


class DuplicateRecord(Exception):
    """A uniqueness rule rejected a write. Persistence adapters raise this."""


class StorageCorrupt(RuntimeError):
    """Stored data failed an integrity check; this is a server-side fault, not a conflict."""
