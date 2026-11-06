"""Project transfer document rules: schema, limits, validation. Framework independent."""

import json
from typing import Any

from forge_org.domain.errors import InvalidInput

SCHEMA_VERSION = 'forge-project-import-v1'
SCHEMA_VERSION_V2 = 'forge-project-transfer-v2'
MAX_EPICS = 100
MAX_FEATURES = 500
MAX_DEPENDENCIES = 5000
MAX_TASKS = 2000
MAX_CRITERIA = 2000
MAX_DOCUMENT_BYTES = 7 * 1024 * 1024


def canonical_json(document: dict[str, Any]) -> str:
    return json.dumps(document, sort_keys=True, separators=(',', ':'), ensure_ascii=True)


def _validate_tags(tags: list[Any]) -> None:
    if len(tags) > 20 or any(
        not isinstance(tag, str) or not tag.strip() or len(tag.strip()) > 40 for tag in tags
    ):
        raise InvalidInput('Tags must contain up to twenty names of 1 to 40 characters')


def validate_document(document: dict[str, Any]) -> dict[str, Any]:
    version = document.get('schema_version')
    if version not in {SCHEMA_VERSION, SCHEMA_VERSION_V2}:
        raise InvalidInput('Unsupported project import schema')
    project = document.get('project')
    epics = document.get('epics', [])
    features = document.get('features', [])
    dependencies = document.get('dependencies', [])
    if not all(isinstance(items, list) for items in (epics, features, dependencies)):
        raise InvalidInput('Import collections must be arrays')
    if not all(isinstance(item, dict) for item in (*epics, *features, *dependencies)):
        raise InvalidInput('Import collection entries must be objects')
    if (
        len(epics) > MAX_EPICS
        or len(features) > MAX_FEATURES
        or len(dependencies) > MAX_DEPENDENCIES
    ):
        raise InvalidInput('Import document exceeds collection limits')
    task_count = sum(
        len(feature.get('tasks', [])) for feature in features if isinstance(feature, dict)
    )
    criterion_count = sum(
        len(feature.get('acceptance_criteria', []))
        for feature in features
        if isinstance(feature, dict)
    )
    if task_count > MAX_TASKS or criterion_count > MAX_CRITERIA:
        raise InvalidInput('Import document exceeds global task or criterion limits')
    if not isinstance(project, dict) or not str(project.get('name', '')).strip():
        raise InvalidInput('Project name is required')
    refs: set[str] = set()
    for item in [
        *epics,
        *features,
        *[task for feature in features for task in feature.get('tasks', [])],
        *[
            criterion
            for feature in features
            for criterion in feature.get('acceptance_criteria', [])
        ],
    ]:
        if not isinstance(item, dict):
            raise InvalidInput('Nested import entries must be objects')
        ref = item.get('ref')
        if not isinstance(ref, str) or ref in refs:
            raise InvalidInput('References must be unique and explicit')
        refs.add(ref)
    epic_refs = {item['ref'] for item in epics}
    feature_refs = {item['ref'] for item in features}
    for feature in features:
        if not isinstance(feature.get('tasks', []), list) or not isinstance(
            feature.get('acceptance_criteria', []), list
        ):
            raise InvalidInput('Feature child collections must be arrays')
        if (
            len(feature.get('tasks', [])) > MAX_TASKS
            or len(feature.get('acceptance_criteria', [])) > MAX_CRITERIA
        ):
            raise InvalidInput('Feature exceeds task or criterion limits')
        if not str(feature.get('title', '')).strip():
            raise InvalidInput('Work Item title is required')
        if any(
            not isinstance(child, dict) or not str(child.get('title', '')).strip()
            for child in feature.get('tasks', [])
        ):
            raise InvalidInput('Task entries require a title')
        if any(
            task.get('status', 'todo') not in {'todo', 'in_progress', 'done'}
            or not isinstance(task.get('position', 0), int)
            or task.get('position', 0) < 0
            for task in feature.get('tasks', [])
        ):
            raise InvalidInput('Task status or position is invalid')
        if any(
            not isinstance(child, dict) or not str(child.get('description', '')).strip()
            for child in feature.get('acceptance_criteria', [])
        ):
            raise InvalidInput('Acceptance criteria require a description')
        if feature.get('epic_ref') and feature['epic_ref'] not in epic_refs:
            raise InvalidInput('Feature references an unknown epic')
    if version == SCHEMA_VERSION_V2:
        valid_priorities = {'low', 'medium', 'high', 'critical'}
        valid_statuses = {'backlog', 'refining', 'ready', 'in_progress', 'verify', 'done'}
        for epic in epics:
            if not isinstance(epic, dict) or not str(epic.get('title', '')).strip():
                raise InvalidInput('Epics require a title')
            if epic.get('priority', 'medium') not in valid_priorities:
                raise InvalidInput('Epic priority is invalid')
            if not isinstance(epic.get('tags', []), list):
                raise InvalidInput('Epic tags must be an array')
            _validate_tags(epic.get('tags', []))
        for feature in features:
            if not str(feature.get('title', '')).strip():
                raise InvalidInput('Work Items require a title')
            if feature.get('kind', 'story') not in {'story', 'bug', 'feature'}:
                raise InvalidInput('Work Item kind is invalid')
            if feature.get('priority', 'medium') not in valid_priorities:
                raise InvalidInput('Work Item priority is invalid')
            if feature.get('status', 'backlog') not in valid_statuses:
                raise InvalidInput('Work Item status is invalid')
            if feature.get('kind') == 'bug' and feature.get('bug_severity') not in valid_priorities:
                raise InvalidInput('Bug severity is invalid')
            if not isinstance(feature.get('tags', []), list):
                raise InvalidInput('Work Item tags must be an array')
            _validate_tags(feature.get('tags', []))
            if len(str(feature.get('notes') or '')) > 8000:
                raise InvalidInput('Work Item notes exceed the limit')
            for key, limit in (
                ('steps_to_reproduce', 8000),
                ('expected_result', 4000),
                ('actual_result', 4000),
            ):
                if len(str(feature.get(key) or '')) > limit:
                    raise InvalidInput(f'{key} exceeds the limit')
    graph: dict[str, set[str]] = {ref: set() for ref in feature_refs}
    for dependency in dependencies:
        if (
            dependency.get('blocking_feature_ref') not in feature_refs
            or dependency.get('blocked_feature_ref') not in feature_refs
        ):
            raise InvalidInput('Dependency references an unknown feature')
        graph[dependency['blocking_feature_ref']].add(dependency['blocked_feature_ref'])
    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(node: str) -> None:
        if node in visiting:
            raise InvalidInput('Dependency graph contains a cycle')
        if node in visited:
            return
        visiting.add(node)
        for child in graph[node]:
            visit(child)
        visiting.remove(node)
        visited.add(node)

    for node in graph:
        visit(node)
    normalized = {
        'schema_version': version,
        'project': {'name': project['name'].strip(), 'description': project.get('description')},
        'epics': epics,
        'features': features,
        'dependencies': dependencies,
    }
    return normalized
