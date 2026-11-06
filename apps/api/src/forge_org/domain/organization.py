from typing import Final

from forge_org.domain.errors import InvalidInput

ACTIVE: Final = 'active'
ARCHIVED: Final = 'archived'


def normalized_name(value: str) -> str:
    name = value.strip()
    if not name:
        raise InvalidInput('Name is required')
    return name


def validate_project_status(value: str) -> str:
    if value not in {ACTIVE, ARCHIVED, 'all'}:
        raise InvalidInput('Unknown project status')
    return value
