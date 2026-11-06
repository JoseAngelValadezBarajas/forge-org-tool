"""Enforce AGENTS.md rule 6: domain and application are framework/infrastructure free.

``LEGACY_APPLICATION_MODULES`` lists modules that still talk to SQLite directly.
It may only shrink: migrate a module behind a port, then remove it from the list.
"""

import ast
from pathlib import Path

SRC = Path(__file__).parents[1] / 'src' / 'forge_org'

FORBIDDEN_FOR_DOMAIN = ('sqlite3', 'fastapi', 'pydantic', 'sqlalchemy', 'forge_org.infrastructure')
FORBIDDEN_FOR_APPLICATION = FORBIDDEN_FOR_DOMAIN
FORBIDDEN_FOR_INFRASTRUCTURE = ('fastapi', 'forge_org.api')

LEGACY_APPLICATION_MODULES = {'attachments', 'project_package', 'transfer'}


def _imports(path: Path) -> set[str]:
    found: set[str] = set()
    for node in ast.walk(ast.parse(path.read_text(encoding='utf-8'))):
        if isinstance(node, ast.Import):
            found.update(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
            found.add(node.module)
    return found


def _violations(layer: str, forbidden: tuple[str, ...], skip: set[str] = frozenset()) -> list[str]:  # type: ignore[assignment]
    problems = []
    for path in sorted((SRC / layer).rglob('*.py')):
        if path.stem in skip:
            continue
        for module in _imports(path):
            if any(module == bad or module.startswith(f'{bad}.') for bad in forbidden):
                problems.append(f'{path.relative_to(SRC)} imports {module}')
    return problems


def test_domain_is_framework_independent() -> None:
    assert _violations('domain', FORBIDDEN_FOR_DOMAIN) == []


def test_application_depends_on_ports_not_infrastructure() -> None:
    assert (
        _violations('application', FORBIDDEN_FOR_APPLICATION, set(LEGACY_APPLICATION_MODULES)) == []
    )


def test_legacy_application_allowlist_only_lists_modules_that_still_violate() -> None:
    for name in LEGACY_APPLICATION_MODULES:
        path = SRC / 'application' / f'{name}.py'
        assert any(
            module == bad or module.startswith(f'{bad}.')
            for module in _imports(path)
            for bad in FORBIDDEN_FOR_APPLICATION
        ), f'{name} is clean: remove it from LEGACY_APPLICATION_MODULES'


def test_infrastructure_does_not_depend_on_the_api_layer() -> None:
    assert _violations('infrastructure', FORBIDDEN_FOR_INFRASTRUCTURE) == []
