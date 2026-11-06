"""Planning rules shared by use cases. Pure functions, no I/O."""

from typing import Any

from forge_org.domain.errors import InvalidInput


def clean_title(value: str | None) -> str:
    """Return the trimmed title or reject a missing/blank one."""
    title = (value or '').strip()
    if not title:
        raise InvalidInput('Title is required')
    return title


def clean_description(value: Any) -> str:
    """Return a non-blank description (acceptance criteria)."""
    text = str(value or '').strip()
    if not text:
        raise InvalidInput('Description is required')
    return text


def ensure_project_writable(project: dict[str, Any]) -> None:
    """Archived projects are read-only for planning content."""
    if project['status'] != 'active':
        raise InvalidInput('Archived projects are read-only')


def dependency_endpoints(values: dict[str, Any]) -> tuple[str, str]:
    """A dependency must connect two different work items."""
    blocking, blocked = values.get('blocking_feature_id'), values.get('blocked_feature_id')
    if not blocking or not blocked or blocking == blocked:
        raise InvalidInput('Dependency must connect two different features')
    return str(blocking), str(blocked)
