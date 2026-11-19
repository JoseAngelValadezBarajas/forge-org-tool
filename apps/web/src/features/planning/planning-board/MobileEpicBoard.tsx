import { type EpicStatus } from '@forge-org/api-client';
import { FormField, SelectV2 } from '@corefoundry-labs/forge-ui';
import styles from '../PlanningPage.module.css';
import { EpicCard, StatusOptions } from '../components';
import type { PlanningModel } from './model';

type Props = Pick<
  PlanningModel,
  | 'workspaceId'
  | 'projectId'
  | 'mobileEpicStatus'
  | 'setMobileEpicStatus'
  | 'updateEpic'
  | 'workflowEpics'
>;

export function MobileEpicBoard({
  workspaceId,
  projectId,
  mobileEpicStatus,
  setMobileEpicStatus,
  updateEpic,
  workflowEpics,
}: Props) {
  return (
    <section aria-label="Mobile Epic board" className={styles.mobileBoard}>
      <FormField label="Epic status">
        <SelectV2
          size="sm"
          aria-label="Mobile Epic status"
          value={mobileEpicStatus}
          onChange={(event) => setMobileEpicStatus(event.target.value)}
        >
          <option value="all">All statuses</option>
          <StatusOptions />
        </SelectV2>
      </FormField>
      <div className={styles.mobileCards}>
        {workflowEpics
          .filter((epic) => mobileEpicStatus === 'all' || epic.status === mobileEpicStatus)
          .map((epic) => (
            <EpicCard
              key={epic.id}
              epic={epic}
              href={`/planning/${workspaceId}/${projectId}/epics/${epic.id}`}
            >
              <label>
                Move Epic
                <SelectV2
                  size="sm"
                  aria-label={`Status for Epic ${epic.title}`}
                  value={epic.status}
                  onChange={(event) => void updateEpic(epic, event.target.value as EpicStatus)}
                >
                  <StatusOptions />
                </SelectV2>
              </label>
            </EpicCard>
          ))}
        {workflowEpics.filter(
          (epic) => mobileEpicStatus === 'all' || epic.status === mobileEpicStatus,
        ).length === 0 && <p>No Epics in this status.</p>}
      </div>
    </section>
  );
}
