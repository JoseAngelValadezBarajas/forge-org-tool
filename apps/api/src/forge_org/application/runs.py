from __future__ import annotations

import hashlib
import json
from typing import Any

from forge_org.infrastructure.sqlite import OrganizationRepository

RUN_STATUSES = {'PLANNED', 'IN_PROGRESS', 'AWAITING_HANDOFF', 'COMPLETED', 'FAILED', 'CANCELLED'}
TRANSITIONS = {'PLANNED': {'IN_PROGRESS', 'CANCELLED'}, 'IN_PROGRESS': {'AWAITING_HANDOFF', 'COMPLETED', 'FAILED', 'CANCELLED'}, 'AWAITING_HANDOFF': {'COMPLETED', 'FAILED', 'CANCELLED'}}

class RunService:
    def __init__(self, connection): self.repository = OrganizationRepository(connection)
    def _project(self, workspace_id: str, project_id: str) -> dict[str, Any]:
        project = self.repository.get_project(workspace_id, project_id)
        if project is None: raise LookupError('Project not found')
        return project
    def _run(self, workspace_id: str, project_id: str, run_id: str) -> dict[str, Any]:
        self._project(workspace_id, project_id); item = self.repository.get_run(project_id, run_id)
        if item is None: raise LookupError('Run not found')
        return item
    def get(self, workspace_id: str, project_id: str, run_id: str) -> dict[str, Any]:
        return self._run(workspace_id, project_id, run_id)
    def create(self, workspace_id: str, project_id: str, values: dict[str, Any]) -> dict[str, Any]:
        project = self._project(workspace_id, project_id)
        if project['status'] != 'active': raise ValueError('Archived projects are read-only')
        if not values.get('title', '').strip(): raise ValueError('Title is required')
        return self.repository.create_run(project_id, values)
    def list_runs(self, workspace_id: str, project_id: str, feature_id: str | None = None, status: str | None = None, search: str | None = None) -> list[dict[str, Any]]:
        self._project(workspace_id, project_id); return self.repository.list_runs(project_id, feature_id, status, search)
    def change_status(self, workspace_id: str, project_id: str, run_id: str, status: str, expected_version: int) -> dict[str, Any]:
        project = self._project(workspace_id, project_id); item = self._run(workspace_id, project_id, run_id)
        if project['status'] != 'active': raise ValueError('Archived projects are read-only')
        if status not in RUN_STATUSES or status not in TRANSITIONS.get(item['status'], set()): raise ValueError('Invalid run status transition')
        if int(item['version']) != expected_version: raise RuntimeError('Run changed; reload before updating')
        return self.repository.update_run(project_id, run_id, {'status': status}) or item
    def events(self, workspace_id: str, project_id: str, run_id: str) -> list[dict[str, Any]]:
        self._run(workspace_id, project_id, run_id); return self.repository.list_events(run_id)
    def add_event(self, workspace_id: str, project_id: str, run_id: str, values: dict[str, Any]) -> dict[str, Any]:
        project = self._project(workspace_id, project_id); item = self._run(workspace_id, project_id, run_id)
        if project['status'] != 'active': raise ValueError('Archived projects are read-only')
        if int(item['version']) != values.pop('expected_version'): raise RuntimeError('Run changed; reload before adding an event')
        event = self.repository.create_event(run_id, values); self.repository.update_run(project_id, run_id, {}); return event

class HandoffService:
    def __init__(self, connection): self.repository = OrganizationRepository(connection)
    def _project(self, workspace_id: str, project_id: str) -> dict[str, Any]:
        project = self.repository.get_project(workspace_id, project_id)
        if project is None: raise LookupError('Project not found')
        return project
    def _handoff(self, workspace_id: str, project_id: str, handoff_id: str) -> dict[str, Any]:
        self._project(workspace_id, project_id); item = self.repository.get_handoff(project_id, handoff_id)
        if item is None: raise LookupError('Handoff not found')
        return item
    def list_handoffs(self, workspace_id: str, project_id: str) -> list[dict[str, Any]]:
        self._project(workspace_id, project_id); return self.repository.list_handoffs(project_id)
    def revisions(self, workspace_id: str, project_id: str, handoff_id: str) -> list[dict[str, Any]]:
        self._handoff(workspace_id, project_id, handoff_id); return self.repository.list_handoff_revisions(handoff_id)
    def get_revision(self, workspace_id: str, project_id: str, handoff_id: str, revision: int) -> dict[str, Any]:
        self._handoff(workspace_id, project_id, handoff_id)
        item = self.repository.get_handoff_revision(handoff_id, revision)
        if item is None: raise LookupError('Handoff revision not found')
        return item
    def create(self, workspace_id: str, project_id: str, values: dict[str, Any]) -> dict[str, Any]:
        project = self._project(workspace_id, project_id)
        if project['status'] != 'active': raise ValueError('Archived projects are read-only')
        if self.repository.get_run(project_id, values['run_id']) is None: raise LookupError('Run not found')
        return self.repository.create_handoff(project_id, values)
    def update(self, workspace_id: str, project_id: str, handoff_id: str, expected_version: int, values: dict[str, Any]) -> dict[str, Any]:
        item = self._handoff(workspace_id, project_id, handoff_id)
        if item['status'] != 'DRAFT': raise ValueError('Only draft handoffs can be edited')
        if int(item['version']) != expected_version: raise RuntimeError('Handoff changed; reload before updating')
        return self.repository.update_handoff(project_id, handoff_id, values) or item
    def ready(self, workspace_id: str, project_id: str, handoff_id: str, expected_version: int) -> dict[str, Any]:
        item = self._handoff(workspace_id, project_id, handoff_id)
        if item['status'] != 'DRAFT': raise ValueError('Only draft handoffs can be made ready')
        if int(item['version']) != expected_version: raise RuntimeError('Handoff changed; reload before updating')
        if not all(str(item[key]).strip() for key in ('title', 'summary', 'next_actions')): raise ValueError('Title, summary and next actions are required')
        payload = {'schema_version': 'forge-handoff-v1', 'handoff_id': item['id'], 'title': item['title'], 'summary': item['summary'], 'next_actions': item['next_actions'], 'status': 'READY'}
        canonical = json.dumps(payload, sort_keys=True, separators=(',', ':'), ensure_ascii=True); fingerprint = hashlib.sha256(canonical.encode()).hexdigest()
        self.repository.create_handoff_revision({'handoff_id': item['id'], 'revision': 1, 'title': item['title'], 'summary': item['summary'], 'next_actions': item['next_actions'], 'schema_version': 'forge-handoff-v1', 'fingerprint': fingerprint, 'payload_json': canonical, 'markdown': f"# {item['title']}\n\n{item['summary']}\n\nNext actions: {item['next_actions']}"})
        return self.repository.update_handoff(project_id, handoff_id, {'status': 'READY', 'current_revision': 1}) or item
    def acknowledge(self, workspace_id: str, project_id: str, handoff_id: str, revision: int, acknowledged_by: str) -> dict[str, Any]:
        item = self._handoff(workspace_id, project_id, handoff_id)
        if item['status'] == 'WITHDRAWN' or item['current_revision'] != revision: raise ValueError('Revision is not acknowledgeable')
        try: result = self.repository.acknowledge_handoff(handoff_id, revision, acknowledged_by)
        except Exception as exc: raise RuntimeError('Handoff revision was already acknowledged') from exc
        self.repository.update_handoff(project_id, handoff_id, {'status': 'ACKNOWLEDGED'}); return result
