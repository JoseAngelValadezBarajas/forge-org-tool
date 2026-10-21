import hashlib
import json
from typing import Any

from forge_org.infrastructure.sqlite import OrganizationRepository, utc_now

RULE_SET_VERSION = 'fnd03-v1'


class ReadinessService:
    def __init__(self, connection):
        self.repository = OrganizationRepository(connection)

    def _feature_context(
        self, workspace_id: str, project_id: str, feature_id: str
    ) -> dict[str, Any]:
        project = self.repository.get_project(workspace_id, project_id)
        feature = self.repository.feature(project_id, feature_id)
        if project is None or feature is None:
            raise LookupError('Feature not found')
        criteria = self.repository.list_criteria(feature_id)
        decisions = self.repository.feature_decisions(feature_id)
        invariants = self.repository.feature_invariants(project_id, feature_id)
        dependencies = []
        for dependency in self.repository.list_dependencies(project_id):
            blocking = self.repository.feature(project_id, dependency['blocking_feature_id'])
            if blocking is not None:
                dependencies.append(
                    {
                        **dependency,
                        'blocking_status': blocking['status'],
                        'blocking_title': blocking['title'],
                    }
                )
        return {
            'feature': feature,
            'project': project,
            'criteria': criteria,
            'decisions': decisions,
            'invariants': invariants,
            'dependencies': dependencies,
        }

    @staticmethod
    def _fingerprint(inputs: dict[str, Any]) -> str:
        payload = json.dumps(
            inputs, sort_keys=True, separators=(',', ':'), ensure_ascii=True
        ).encode()
        return hashlib.sha256(payload).hexdigest()

    def evaluate(self, workspace_id: str, project_id: str, feature_id: str) -> dict[str, Any]:
        inputs = self._feature_context(workspace_id, project_id, feature_id)
        feature, project = inputs['feature'], inputs['project']
        results: list[dict[str, Any]] = []
        r1_blockers = []
        if not feature['title'].strip():
            r1_blockers.append(
                {'code': 'R01_TITLE', 'message': 'Add a useful feature title.', 'references': []}
            )
        if not (feature['goal'] or '').strip():
            r1_blockers.append(
                {
                    'code': 'R01_GOAL',
                    'message': 'Describe the functional goal before starting implementation.',
                    'references': [],
                }
            )
        results.append(
            self._result('R01', r1_blockers, 'Feature title and functional goal are defined.')
        )
        r2_blockers = (
            []
            if inputs['criteria']
            else [
                {
                    'code': 'R02_MISSING',
                    'message': 'Add at least one acceptance criterion.',
                    'references': [],
                }
            ]
        )
        results.append(
            self._result(
                'R02',
                r2_blockers,
                'Acceptance criteria describe expected behavior; satisfied is not proof.',
            )
        )
        r3_blockers = [
            {
                'code': 'R03_PENDING_DEPENDENCY',
                'message': f'{item["blocking_title"]} must be done before this feature can start.',
                'references': [],
            }
            for item in inputs['dependencies']
            if item['blocked_feature_id'] == feature['id'] and item['blocking_status'] != 'done'
        ]
        results.append(
            self._result(
                'R03',
                r3_blockers,
                'Blocking features are manual planning declarations; no technical evidence was checked.',
            )
        )
        r4_blockers = [
            {
                'code': 'R04_DECISION_NOT_ACCEPTED',
                'message': f"Decision '{item['title']}' needs acceptance.",
                'references': [],
            }
            for item in inputs['decisions']
            if item['status'] != 'accepted'
        ]
        results.append(self._result('R04', r4_blockers, 'Linked decisions are accepted.'))
        r5_blockers = [
            {
                'code': 'R05_ACKNOWLEDGEMENT_REQUIRED',
                'message': f"Review invariant '{item['title']}' at revision {item['revision']}.",
                'references': [],
            }
            for item in inputs['invariants']
            if item['acknowledged_revision'] != item['revision']
        ]
        results.append(
            self._result('R05', r5_blockers, 'Applicable invariants have current acknowledgements.')
        )
        r6_blockers = (
            []
            if project['status'] == 'active'
            else [
                {
                    'code': 'R06_ARCHIVED_PROJECT',
                    'message': 'Restore the archived project before starting new development.',
                    'references': [],
                }
            ]
        )
        results.append(self._result('R06', r6_blockers, 'The project is active.'))
        failed = [item['rule_id'] for item in results if item['result'] == 'failed']
        return {
            'feature_id': feature_id,
            'evaluated_at': utc_now(),
            'rule_set_version': RULE_SET_VERSION,
            'input_fingerprint': self._fingerprint(inputs),
            'outcome': 'READY_TO_START' if not failed else 'NOT_READY',
            'passed_checks': [item['rule_id'] for item in results if item['result'] == 'passed'],
            'failed_checks': failed,
            'blockers': [blocker for item in results for blocker in item['blockers']],
            'results': results,
            'input_snapshot': inputs,
        }

    @staticmethod
    def _result(rule_id: str, blockers: list[dict[str, Any]], explanation: str) -> dict[str, Any]:
        return {
            'rule_id': rule_id,
            'rule_version': '1.0',
            'result': 'failed' if blockers else 'passed',
            'explanation': explanation,
            'blockers': blockers,
            'references': [],
        }

    def save(self, workspace_id: str, project_id: str, feature_id: str) -> dict[str, Any]:
        context = self._feature_context(workspace_id, project_id, feature_id)
        if context['project']['status'] != 'active':
            raise ValueError('Archived projects are read-only')
        evaluation = self.evaluate(workspace_id, project_id, feature_id)
        encoded = {
            key: json.dumps(evaluation[key], sort_keys=True)
            for key in ('passed_checks', 'failed_checks', 'blockers', 'results', 'input_snapshot')
        }
        saved = self.repository.save_evaluation({**evaluation, **encoded})
        return {
            **saved,
            **{
                key: json.loads(saved[key])
                for key in (
                    'passed_checks',
                    'failed_checks',
                    'blockers',
                    'results',
                    'input_snapshot',
                )
            },
        }

    def history(self, workspace_id: str, project_id: str, feature_id: str) -> list[dict[str, Any]]:
        self._feature_context(workspace_id, project_id, feature_id)
        current = self.evaluate(workspace_id, project_id, feature_id)['input_fingerprint']
        return [
            {
                **item,
                'evaluation_id': item['id'],
                'stale': item['input_fingerprint'] != current,
                **{
                    key: json.loads(item[key])
                    for key in (
                        'passed_checks',
                        'failed_checks',
                        'blockers',
                        'results',
                        'input_snapshot',
                    )
                },
            }
            for item in self.repository.list_evaluations(feature_id)
        ]
