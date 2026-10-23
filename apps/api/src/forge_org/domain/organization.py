from typing import Final

ACTIVE: Final = 'active'
ARCHIVED: Final = 'archived'


def normalized_name(value: str) -> str:
    name = value.strip()
    if not name:
        raise ValueError('Name is required')
    return name


def validate_project_status(value: str) -> str:
    if value not in {ACTIVE, ARCHIVED, 'all'}:
        raise ValueError('Unknown project status')
    return value
