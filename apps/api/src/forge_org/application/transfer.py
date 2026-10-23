import hashlib
import json
import sqlite3
from pathlib import Path
from typing import Any
from uuid import uuid4

from forge_org.infrastructure.connection import utc_now
from forge_org.infrastructure.persistence import OrganizationRepository

SCHEMA_VERSION = 'forge-project-import-v1'
SCHEMA_VERSION_V2 = 'forge-project-transfer-v2'
MAX_EPICS = 100
MAX_FEATURES = 500
MAX_DEPENDENCIES = 5000
MAX_TASKS = 2000
MAX_CRITERIA = 2000
MAX_DOCUMENT_BYTES = 7 * 1024 * 1024


class ProjectTransferService:
    def __init__(self, connection: sqlite3.Connection, storage_root: Path | None = None) -> None:
        self.connection = connection
        self.storage_root = storage_root

    @staticmethod
    def canonical(document: dict[str, Any]) -> str:
        return json.dumps(document, sort_keys=True, separators=(',', ':'), ensure_ascii=True)

    @staticmethod
    def _validate_tags(tags: list[Any]) -> None:
        if len(tags) > 20 or any(
            not isinstance(tag, str) or not tag.strip() or len(tag.strip()) > 40 for tag in tags
        ):
            raise ValueError('Tags must contain up to twenty names of 1 to 40 characters')

    def validate(self, document: dict[str, Any]) -> dict[str, Any]:
        version = document.get('schema_version')
        if version not in {SCHEMA_VERSION, SCHEMA_VERSION_V2}:
            raise ValueError('Unsupported project import schema')
        project = document.get('project')
        epics = document.get('epics', [])
        features = document.get('features', [])
        dependencies = document.get('dependencies', [])
        if not all(isinstance(items, list) for items in (epics, features, dependencies)):
            raise ValueError('Import collections must be arrays')
        if not all(isinstance(item, dict) for item in (*epics, *features, *dependencies)):
            raise ValueError('Import collection entries must be objects')
        if (
            len(epics) > MAX_EPICS
            or len(features) > MAX_FEATURES
            or len(dependencies) > MAX_DEPENDENCIES
        ):
            raise ValueError('Import document exceeds collection limits')
        task_count = sum(
            len(feature.get('tasks', [])) for feature in features if isinstance(feature, dict)
        )
        criterion_count = sum(
            len(feature.get('acceptance_criteria', []))
            for feature in features
            if isinstance(feature, dict)
        )
        if task_count > MAX_TASKS or criterion_count > MAX_CRITERIA:
            raise ValueError('Import document exceeds global task or criterion limits')
        if not isinstance(project, dict) or not str(project.get('name', '')).strip():
            raise ValueError('Project name is required')
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
                raise ValueError('Nested import entries must be objects')
            ref = item.get('ref')
            if not isinstance(ref, str) or ref in refs:
                raise ValueError('References must be unique and explicit')
            refs.add(ref)
        epic_refs = {item['ref'] for item in epics}
        feature_refs = {item['ref'] for item in features}
        for feature in features:
            if not isinstance(feature.get('tasks', []), list) or not isinstance(
                feature.get('acceptance_criteria', []), list
            ):
                raise TypeError('Feature child collections must be arrays')
            if (
                len(feature.get('tasks', [])) > MAX_TASKS
                or len(feature.get('acceptance_criteria', [])) > MAX_CRITERIA
            ):
                raise ValueError('Feature exceeds task or criterion limits')
            if not str(feature.get('title', '')).strip():
                raise ValueError('Work Item title is required')
            if any(
                not isinstance(child, dict) or not str(child.get('title', '')).strip()
                for child in feature.get('tasks', [])
            ):
                raise ValueError('Task entries require a title')
            if any(
                not isinstance(child, dict) or not str(child.get('description', '')).strip()
                for child in feature.get('acceptance_criteria', [])
            ):
                raise ValueError('Acceptance criteria require a description')
            if feature.get('epic_ref') and feature['epic_ref'] not in epic_refs:
                raise ValueError('Feature references an unknown epic')
        if version == SCHEMA_VERSION_V2:
            valid_priorities = {'low', 'medium', 'high', 'critical'}
            valid_statuses = {'backlog', 'refining', 'ready', 'in_progress', 'verify', 'done'}
            for epic in epics:
                if not isinstance(epic, dict) or not str(epic.get('title', '')).strip():
                    raise ValueError('Epics require a title')
                if epic.get('priority', 'medium') not in valid_priorities:
                    raise ValueError('Epic priority is invalid')
                if not isinstance(epic.get('tags', []), list):
                    raise TypeError('Epic tags must be an array')
                self._validate_tags(epic.get('tags', []))
            for feature in features:
                if not str(feature.get('title', '')).strip():
                    raise ValueError('Work Items require a title')
                if feature.get('kind', 'story') not in {'story', 'bug', 'feature'}:
                    raise ValueError('Work Item kind is invalid')
                if feature.get('priority', 'medium') not in valid_priorities:
                    raise ValueError('Work Item priority is invalid')
                if feature.get('status', 'backlog') not in valid_statuses:
                    raise ValueError('Work Item status is invalid')
                if (
                    feature.get('kind') == 'bug'
                    and feature.get('bug_severity') not in valid_priorities
                ):
                    raise ValueError('Bug severity is invalid')
                if not isinstance(feature.get('tags', []), list):
                    raise TypeError('Work Item tags must be an array')
                self._validate_tags(feature.get('tags', []))
                if len(str(feature.get('notes') or '')) > 8000:
                    raise ValueError('Work Item notes exceed the limit')
                for key, limit in (
                    ('steps_to_reproduce', 8000),
                    ('expected_result', 4000),
                    ('actual_result', 4000),
                ):
                    if len(str(feature.get(key) or '')) > limit:
                        raise ValueError(f'{key} exceeds the limit')
        graph: dict[str, set[str]] = {ref: set() for ref in feature_refs}
        for dependency in dependencies:
            if (
                dependency.get('blocking_feature_ref') not in feature_refs
                or dependency.get('blocked_feature_ref') not in feature_refs
            ):
                raise ValueError('Dependency references an unknown feature')
            graph[dependency['blocking_feature_ref']].add(dependency['blocked_feature_ref'])
        visiting: set[str] = set()
        visited: set[str] = set()

        def visit(node: str) -> None:
            if node in visiting:
                raise ValueError('Dependency graph contains a cycle')
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

    def preview(self, workspace_id: str, document: dict[str, Any]) -> dict[str, Any]:
        if (
            self.connection.execute(
                'SELECT 1 FROM workspaces WHERE id = ?', (workspace_id,)
            ).fetchone()
            is None
        ):
            raise LookupError('Workspace not found')
        normalized = self.validate(document)
        canonical = self.canonical(normalized)
        if len(canonical.encode('utf-8')) > MAX_DOCUMENT_BYTES:
            raise ValueError('Import document exceeds the 7 MiB limit')
        return {
            'schema_version': normalized['schema_version'],
            'fingerprint': hashlib.sha256(canonical.encode()).hexdigest(),
            'project': normalized['project'],
            'counts': {
                'epics': len(normalized['epics']),
                'features': len(normalized['features']),
                'tasks': sum(len(item.get('tasks', [])) for item in normalized['features']),
                'acceptance_criteria': sum(
                    len(item.get('acceptance_criteria', [])) for item in normalized['features']
                ),
                'dependencies': len(normalized['dependencies']),
            },
        }

    def import_project(
        self,
        workspace_id: str,
        document: dict[str, Any],
        expected_fingerprint: str,
        *,
        commit: bool = True,
    ) -> dict[str, Any]:
        normalized = self.validate(document)
        canonical = self.canonical(normalized)
        if len(canonical.encode('utf-8')) > MAX_DOCUMENT_BYTES:
            raise ValueError('Import document exceeds the 7 MiB limit')
        fingerprint = hashlib.sha256(canonical.encode()).hexdigest()
        if fingerprint != expected_fingerprint:
            raise RuntimeError('Import fingerprint does not match the reviewed document')
        project_id = str(uuid4())
        now = utc_now()
        refs: list[dict[str, str]] = []
        try:
            self.connection.execute(
                "INSERT INTO projects(id, workspace_id, name, description, status, created_at, updated_at, archived_at) VALUES (?, ?, ?, ?, 'active', ?, ?, NULL)",
                (
                    project_id,
                    workspace_id,
                    normalized['project']['name'],
                    normalized['project'].get('description'),
                    now,
                    now,
                ),
            )
            epic_ids: dict[str, str] = {}
            for epic in normalized['epics']:
                epic_id = str(uuid4())
                epic_ids[epic['ref']] = epic_id
                self.connection.execute(
                    'INSERT INTO epics(id, project_id, title, description, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    (
                        epic_id,
                        project_id,
                        epic['title'],
                        epic.get('description'),
                        epic.get('priority', 'medium'),
                        now,
                        now,
                    ),
                )
                if normalized['schema_version'] == SCHEMA_VERSION_V2:
                    OrganizationRepository(self.connection)._set_work_item_tags(
                        workspace_id, 'epic', epic_id, epic.get('tags', [])
                    )
                refs.append({'ref': epic['ref'], 'generated_id': epic_id})
            feature_ids: dict[str, str] = {}
            for feature in normalized['features']:
                feature_id = str(uuid4())
                feature_ids[feature['ref']] = feature_id
                self.connection.execute(
                    'INSERT INTO features(id, project_id, epic_id, title, description, goal, priority, status, kind, bug_severity, steps_to_reproduce, expected_result, actual_result, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    (
                        feature_id,
                        project_id,
                        epic_ids.get(feature.get('epic_ref')),
                        feature['title'],
                        feature.get('description'),
                        feature.get('goal'),
                        feature.get('priority', 'medium'),
                        feature.get('status', 'backlog'),
                        feature.get(
                            'kind',
                            'story'
                            if normalized['schema_version'] == SCHEMA_VERSION_V2
                            else 'feature',
                        ),
                        feature.get('bug_severity'),
                        feature.get('steps_to_reproduce'),
                        feature.get('expected_result'),
                        feature.get('actual_result'),
                        feature.get('notes'),
                        now,
                        now,
                    ),
                )
                if normalized['schema_version'] == SCHEMA_VERSION_V2:
                    OrganizationRepository(self.connection)._set_work_item_tags(
                        workspace_id, 'feature', feature_id, feature.get('tags', [])
                    )
                refs.append({'ref': feature['ref'], 'generated_id': feature_id})
                for task in feature.get('tasks', []):
                    self.connection.execute(
                        'INSERT INTO tasks(id, feature_id, title, description, status, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                        (
                            str(uuid4()),
                            feature_id,
                            task['title'],
                            task.get('description'),
                            task.get('status', 'todo'),
                            task.get('position', 0),
                            now,
                            now,
                        ),
                    )
                for criterion in feature.get('acceptance_criteria', []):
                    self.connection.execute(
                        'INSERT INTO acceptance_criteria(id, feature_id, description, satisfied, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        (
                            str(uuid4()),
                            feature_id,
                            criterion['description'],
                            bool(criterion.get('satisfied', False)),
                            criterion.get('position', 0),
                            now,
                            now,
                        ),
                    )
            for dependency in normalized['dependencies']:
                self.connection.execute(
                    'INSERT INTO feature_dependencies(id, project_id, blocking_feature_id, blocked_feature_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
                    (
                        str(uuid4()),
                        project_id,
                        feature_ids[dependency['blocking_feature_ref']],
                        feature_ids[dependency['blocked_feature_ref']],
                        now,
                        now,
                    ),
                )
            if commit:
                self.connection.commit()
        except Exception:
            self.connection.rollback()
            raise
        return {
            'schema_version': normalized['schema_version'],
            'project_id': project_id,
            'fingerprint': fingerprint,
            'references': refs,
            'counts': self.preview(workspace_id, normalized)['counts'],
        }

    def export_project(
        self, workspace_id: str, project_id: str, schema_version: str = SCHEMA_VERSION
    ) -> dict[str, Any]:
        if schema_version not in {SCHEMA_VERSION, SCHEMA_VERSION_V2}:
            raise ValueError('Unsupported project export schema')
        project = self.connection.execute(
            'SELECT * FROM projects WHERE workspace_id = ? AND id = ?', (workspace_id, project_id)
        ).fetchone()
        if project is None:
            raise LookupError('Project not found')
        epics = [
            dict(row)
            for row in self.connection.execute(
                'SELECT * FROM epics WHERE project_id = ? ORDER BY created_at', (project_id,)
            ).fetchall()
        ]
        epic_refs = {item['id']: f'epic:{index + 1:03d}' for index, item in enumerate(epics)}
        features = []
        feature_refs_by_id: dict[str, str] = {}
        for index, item in enumerate(
            self.connection.execute(
                'SELECT * FROM features WHERE project_id = ? ORDER BY created_at', (project_id,)
            ).fetchall()
        ):
            feature = dict(item)
            feature_ref = f'feature:{index + 1:03d}'
            feature_refs_by_id[item['id']] = feature_ref
            tasks = [
                dict(row)
                for row in self.connection.execute(
                    'SELECT * FROM tasks WHERE feature_id = ? ORDER BY position, id', (item['id'],)
                ).fetchall()
            ]
            criteria = [
                dict(row)
                for row in self.connection.execute(
                    'SELECT * FROM acceptance_criteria WHERE feature_id = ? ORDER BY position, id',
                    (item['id'],),
                ).fetchall()
            ]
            features.append(
                {
                    'ref': feature_ref,
                    'title': feature['title'],
                    'description': feature['description'],
                    'goal': feature['goal'],
                    'priority': feature['priority'],
                    'status': feature['status'],
                    'epic_ref': epic_refs.get(feature['epic_id']),
                    'tasks': [
                        {
                            'ref': f'task:{task_index + 1:03d}',
                            'title': task['title'],
                            'description': task['description'],
                            'status': task['status'],
                            'position': task['position'],
                        }
                        for task_index, task in enumerate(tasks)
                    ],
                    'acceptance_criteria': [
                        {
                            'ref': f'criterion:{criterion_index + 1:03d}',
                            'description': criterion['description'],
                            'satisfied': bool(criterion['satisfied']),
                            'position': criterion['position'],
                        }
                        for criterion_index, criterion in enumerate(criteria)
                    ],
                    **(
                        {
                            'kind': feature.get('kind', 'feature'),
                            'bug_severity': feature.get('bug_severity'),
                            'steps_to_reproduce': feature.get('steps_to_reproduce'),
                            'expected_result': feature.get('expected_result'),
                            'actual_result': feature.get('actual_result'),
                            'notes': feature.get('notes'),
                            'tags': self._tag_names('feature', item['id']),
                        }
                        if schema_version == SCHEMA_VERSION_V2
                        else {}
                    ),
                }
            )
        dependencies = [
            dict(row)
            for row in self.connection.execute(
                'SELECT blocking_feature_id, blocked_feature_id FROM feature_dependencies WHERE project_id = ? ORDER BY created_at, id',
                (project_id,),
            ).fetchall()
        ]
        exported_dependencies = [
            {
                'blocking_feature_ref': feature_refs_by_id[item['blocking_feature_id']],
                'blocked_feature_ref': feature_refs_by_id[item['blocked_feature_id']],
            }
            for item in dependencies
        ]
        return self.validate(
            {
                'schema_version': schema_version,
                'project': {'name': project['name'], 'description': project['description']},
                'epics': [
                    {
                        'ref': epic_refs[item['id']],
                        'title': item['title'],
                        'description': item['description'],
                        **(
                            {
                                'priority': item['priority'],
                                'tags': self._tag_names('epic', item['id']),
                            }
                            if schema_version == SCHEMA_VERSION_V2
                            else {}
                        ),
                    }
                    for item in epics
                ],
                'features': features,
                'dependencies': exported_dependencies,
            }
        )

    def _tag_names(self, item_type: str, item_id: str) -> list[str]:
        table, column = {
            'epic': ('epic_tags', 'epic_id'),
            'feature': ('feature_tags', 'feature_id'),
        }[item_type]
        return [
            row[0]
            for row in self.connection.execute(
                f'SELECT tags.name FROM {table} JOIN tags ON tags.id = {table}.tag_id '
                f'WHERE {column} = ? ORDER BY tags.normalized_name',
                (item_id,),
            ).fetchall()
        ]
