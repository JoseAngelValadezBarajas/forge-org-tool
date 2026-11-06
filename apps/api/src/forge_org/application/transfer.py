import hashlib
from pathlib import Path
from typing import Any
from uuid import uuid4

from forge_org.application.ports import TransferStore
from forge_org.domain.clock import utc_now
from forge_org.domain.errors import Conflict, InvalidInput, NotFound
from forge_org.domain.transfer_document import (
    MAX_DOCUMENT_BYTES,
    SCHEMA_VERSION,
    SCHEMA_VERSION_V2,
    canonical_json,
    validate_document,
)


class ProjectTransferService:
    def __init__(self, store: TransferStore, storage_root: Path | None = None) -> None:
        self.store = store
        self.storage_root = storage_root

    @staticmethod
    def canonical(document: dict[str, Any]) -> str:
        return canonical_json(document)

    def validate(self, document: dict[str, Any]) -> dict[str, Any]:
        return validate_document(document)

    def preview(self, workspace_id: str, document: dict[str, Any]) -> dict[str, Any]:
        if not self.store.workspace_exists(workspace_id):
            raise NotFound('Workspace not found')
        normalized = self.validate(document)
        canonical = self.canonical(normalized)
        if len(canonical.encode('utf-8')) > MAX_DOCUMENT_BYTES:
            raise InvalidInput('Import document exceeds the 7 MiB limit')
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
            raise InvalidInput('Import document exceeds the 7 MiB limit')
        fingerprint = hashlib.sha256(canonical.encode()).hexdigest()
        if fingerprint != expected_fingerprint:
            raise Conflict('Import fingerprint does not match the reviewed document')
        project_id = str(uuid4())
        now = utc_now()
        refs: list[dict[str, str]] = []
        try:
            self.store.insert_project(
                project_id,
                workspace_id,
                normalized['project']['name'],
                normalized['project'].get('description'),
                now,
            )
            is_v2 = normalized['schema_version'] == SCHEMA_VERSION_V2
            epic_ids: dict[str, str] = {}
            for epic in normalized['epics']:
                epic_id = str(uuid4())
                epic_ids[epic['ref']] = epic_id
                self.store.insert_epic(
                    epic_id,
                    project_id,
                    epic['title'],
                    epic.get('description'),
                    epic.get('priority', 'medium'),
                    now,
                )
                if is_v2:
                    self.store.set_work_item_tags(
                        workspace_id, 'epic', epic_id, epic.get('tags', [])
                    )
                refs.append({'ref': epic['ref'], 'generated_id': epic_id})
            feature_ids: dict[str, str] = {}
            for feature in normalized['features']:
                feature_id = str(uuid4())
                feature_ids[feature['ref']] = feature_id
                self.store.insert_feature(
                    feature_id,
                    project_id,
                    {
                        'epic_id': epic_ids.get(feature.get('epic_ref')),
                        'title': feature['title'],
                        'description': feature.get('description'),
                        'goal': feature.get('goal'),
                        'priority': feature.get('priority', 'medium'),
                        'status': feature.get('status', 'backlog'),
                        'kind': feature.get('kind', 'story' if is_v2 else 'feature'),
                        'bug_severity': feature.get('bug_severity'),
                        'steps_to_reproduce': feature.get('steps_to_reproduce'),
                        'expected_result': feature.get('expected_result'),
                        'actual_result': feature.get('actual_result'),
                        'notes': feature.get('notes'),
                    },
                    now,
                )
                if is_v2:
                    self.store.set_work_item_tags(
                        workspace_id, 'feature', feature_id, feature.get('tags', [])
                    )
                refs.append({'ref': feature['ref'], 'generated_id': feature_id})
                for task in feature.get('tasks', []):
                    self.store.insert_task(
                        str(uuid4()),
                        feature_id,
                        task['title'],
                        task.get('description'),
                        task.get('status', 'todo'),
                        task.get('position', 0),
                        now,
                    )
                for criterion in feature.get('acceptance_criteria', []):
                    self.store.insert_criterion(
                        str(uuid4()),
                        feature_id,
                        criterion['description'],
                        bool(criterion.get('satisfied', False)),
                        criterion.get('position', 0),
                        now,
                    )
            for dependency in normalized['dependencies']:
                self.store.insert_dependency(
                    str(uuid4()),
                    project_id,
                    feature_ids[dependency['blocking_feature_ref']],
                    feature_ids[dependency['blocked_feature_ref']],
                    now,
                )
            if commit:
                self.store.commit()
        except Exception:
            self.store.rollback()
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
            raise InvalidInput('Unsupported project export schema')
        project = self.store.export_project_row(workspace_id, project_id)
        if project is None:
            raise NotFound('Project not found')
        epics = self.store.export_epics(project_id)
        epic_refs = {item['id']: f'epic:{index + 1:03d}' for index, item in enumerate(epics)}
        features = []
        feature_refs_by_id: dict[str, str] = {}
        for index, item in enumerate(self.store.export_features(project_id)):
            feature = dict(item)
            feature_ref = f'feature:{index + 1:03d}'
            feature_refs_by_id[item['id']] = feature_ref
            tasks = self.store.export_tasks(item['id'])
            criteria = self.store.export_criteria(item['id'])
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
        dependencies = self.store.export_dependencies(project_id)
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

    def _contextual_payload(
        self,
        workspace_id: str,
        project_id: str,
        scope: str,
        destination_id: str,
        document: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        status = self.store.project_status(workspace_id, project_id)
        if status is None:
            raise NotFound('Project not found')
        if status != 'active':
            raise InvalidInput('Archived projects do not accept imports')
        if scope == 'epics':
            if destination_id != project_id and not self.store.epic_exists(
                project_id, destination_id
            ):
                raise NotFound('Destination Epic not found in this project')
        elif scope == 'work-items':
            if not self.store.epic_exists(project_id, destination_id):
                raise NotFound('Destination Epic not found in this project')
        elif scope == 'tasks':
            if not self.store.feature_exists(project_id, destination_id):
                raise NotFound('Destination Work Item not found in this project')
        else:
            raise InvalidInput('Unsupported contextual transfer scope')
        if document is None:
            return None
        normalized = self.validate(document)
        if normalized['schema_version'] != SCHEMA_VERSION_V2:
            raise InvalidInput('Contextual transfer requires forge-project-transfer-v2')
        if scope == 'epics':
            if len(normalized['epics']) != 1:
                raise InvalidInput('Epic transfer must contain exactly one Epic')
            epic_ref = normalized['epics'][0]['ref']
            if any(feature.get('epic_ref') != epic_ref for feature in normalized['features']):
                raise InvalidInput('Epic transfer Work Items must reference its Epic')
        elif scope == 'work-items':
            if normalized['epics'] or not normalized['features']:
                raise InvalidInput('Work Item transfer must contain Work Items and no Epics')
        else:
            if (
                normalized['epics']
                or len(normalized['features']) != 1
                or not normalized['features'][0].get('tasks')
                or normalized['features'][0].get('acceptance_criteria')
            ):
                raise InvalidInput('Task transfer must contain Tasks for exactly one Work Item')
        canonical = self.canonical(normalized)
        if len(canonical.encode('utf-8')) > MAX_DOCUMENT_BYTES:
            raise InvalidInput('Import document exceeds the 7 MiB limit')
        return normalized

    def preview_contextual_import(
        self,
        workspace_id: str,
        project_id: str,
        scope: str,
        destination_id: str,
        document: dict[str, Any],
    ) -> dict[str, Any]:
        normalized = self._contextual_payload(
            workspace_id, project_id, scope, destination_id, document
        )
        assert normalized is not None
        preview = self.preview(workspace_id, normalized)
        envelope = self.canonical(
            {
                'scope': scope,
                'workspace_id': workspace_id,
                'project_id': project_id,
                'destination_id': destination_id,
                'document': normalized,
            }
        )
        preview['fingerprint'] = hashlib.sha256(envelope.encode()).hexdigest()
        preview['destination'] = {'scope': scope, 'id': destination_id}
        return preview

    def import_contextual(
        self,
        workspace_id: str,
        project_id: str,
        scope: str,
        destination_id: str,
        document: dict[str, Any],
        expected_fingerprint: str,
    ) -> dict[str, Any]:
        preview = self.preview_contextual_import(
            workspace_id, project_id, scope, destination_id, document
        )
        if preview['fingerprint'] != expected_fingerprint:
            raise Conflict(
                'Import fingerprint does not match the reviewed destination and document'
            )
        normalized = self.validate(document)
        now = utc_now()
        references: list[dict[str, str]] = []
        if scope == 'tasks':
            feature_id = destination_id
            position = self.store.next_task_position(feature_id)
            try:
                for task in normalized['features'][0]['tasks']:
                    task_id = str(uuid4())
                    self.store.insert_task(
                        task_id,
                        feature_id,
                        task['title'],
                        task.get('description'),
                        task.get('status', 'todo'),
                        position,
                        now,
                    )
                    references.append({'ref': task['ref'], 'generated_id': task_id})
                    position += 1
                self.store.commit()
            except Exception:
                self.store.rollback()
                raise
            return {
                'schema_version': normalized['schema_version'],
                'workspace_id': workspace_id,
                'project_id': project_id,
                'fingerprint': expected_fingerprint,
                'references': references,
                'counts': preview['counts'],
            }

        staged_document = {
            **normalized,
            'project': {
                'name': f'__contextual_{uuid4()}__',
                'description': normalized['project'].get('description'),
            },
        }
        staged_preview = self.preview(workspace_id, staged_document)
        try:
            imported = self.import_project(
                workspace_id, staged_document, staged_preview['fingerprint'], commit=False
            )
            staged_project_id = imported['project_id']
            self.store.adopt_staged_project(scope, staged_project_id, project_id, destination_id)
            self.store.commit()
        except Exception:
            self.store.rollback()
            raise
        return {
            'schema_version': normalized['schema_version'],
            'workspace_id': workspace_id,
            'project_id': project_id,
            'fingerprint': expected_fingerprint,
            'references': imported['references'],
            'counts': preview['counts'],
        }

    def export_contextual(
        self,
        workspace_id: str,
        project_id: str,
        scope: str,
        destination_id: str,
        schema_version: str = SCHEMA_VERSION_V2,
    ) -> dict[str, Any]:
        document = self.export_project(workspace_id, project_id, schema_version)
        if scope == 'epics':
            if not self.store.epic_exists(project_id, destination_id):
                raise NotFound('Epic not found in this project')
            epic_id_order = self.store.epic_ids_in_export_order(project_id)
            epic_ref = f'epic:{epic_id_order.index(destination_id) + 1:03d}'
            document['epics'] = [item for item in document['epics'] if item['ref'] == epic_ref]
            document['features'] = [
                item for item in document['features'] if item.get('epic_ref') == epic_ref
            ]
        elif scope == 'work-items':
            if not self.store.epic_exists(project_id, destination_id):
                raise NotFound('Epic not found in this project')
            epic_id_order = self.store.epic_ids_in_export_order(project_id)
            epic_ref = f'epic:{epic_id_order.index(destination_id) + 1:03d}'
            document['epics'] = []
            document['features'] = [
                {key: value for key, value in item.items() if key != 'epic_ref'}
                for item in document['features']
                if item.get('epic_ref') == epic_ref
            ]
            if not document['features']:
                raise InvalidInput('Epic has no Work Items to export')
        elif scope == 'tasks':
            if not self.store.feature_exists(project_id, destination_id):
                raise NotFound('Work Item not found in this project')
            feature_ids = self.store.feature_ids_in_export_order(project_id)
            feature_ref = f'feature:{feature_ids.index(destination_id) + 1:03d}'
            document['epics'] = []
            document['dependencies'] = []
            document['features'] = [
                {
                    **{key: value for key, value in item.items() if key != 'epic_ref'},
                    'acceptance_criteria': [],
                }
                for item in document['features']
                if item['ref'] == feature_ref
            ]
        else:
            raise InvalidInput('Unsupported contextual transfer scope')
        document['dependencies'] = [
            item
            for item in document['dependencies']
            if any(f['ref'] == item['blocking_feature_ref'] for f in document['features'])
            and any(f['ref'] == item['blocked_feature_ref'] for f in document['features'])
        ]
        return self.validate(document)

    def _tag_names(self, item_type: str, item_id: str) -> list[str]:
        return self.store.tag_names(item_type, item_id)
