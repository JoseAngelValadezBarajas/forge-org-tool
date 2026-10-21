"""Bounded capability composition for the public API router.

The endpoint implementations remain in the legacy-compatible module while this
composition layer gives the application one explicit router per capability.
That keeps route ownership visible and makes the migration incremental without
changing paths, dependencies, response models, or transaction behavior.
"""

from collections.abc import Callable

from fastapi import APIRouter
from fastapi.routing import APIRoute


def _group(source: APIRouter, predicate: Callable[[str], bool], assigned: set[int]) -> APIRouter:
    group = APIRouter()
    group.routes.extend(
        route
        for route in source.routes
        if isinstance(route, APIRoute) and id(route) not in assigned and predicate(route.path)
    )
    return group


def _has_prefixes(prefixes: tuple[str, ...]) -> Callable[[str], bool]:
    return lambda path: any(prefix in path for prefix in prefixes)


def build_capability_router(source: APIRouter) -> APIRouter:
    """Compose the existing public routes into bounded capability groups."""
    groups = (
        (
            'planning',
            (
                '/planning/',
                '/epics',
                '/features',
                '/criteria',
                '/tasks',
                '/dependencies',
                '/decisions',
                '/invariants',
            ),
        ),
        ('organization', ('/workspaces',)),
        ('readiness', ('/readiness',)),
        ('repositories', ('/repositories', '/observations')),
        ('context', ('/context',)),
        ('workbench', ('/runs', '/handoffs')),
        ('delivery', ('/evidence', '/verifications', '/release-candidates')),
        ('transfer', ('/import', '/export')),
    )
    composed = APIRouter()
    assigned: set[int] = set()
    for _, prefixes in groups:
        group = _group(source, _has_prefixes(prefixes), assigned)
        assigned.update(id(route) for route in group.routes)
        composed.include_router(group)

    # Preserve any future/system route until its capability is explicitly split.
    remainder = APIRouter()
    remainder.routes.extend(route for route in source.routes if id(route) not in assigned)
    composed.include_router(remainder)
    return composed
