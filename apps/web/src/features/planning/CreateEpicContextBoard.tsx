import { Link } from 'react-router-dom';
import type { Epic } from '@forge-org/api-client';
import styles from './CreateEpicContextBoard.module.css';

const previewStatuses = [
  { value: 'backlog', label: 'BACKLOG' },
  { value: 'ready', label: 'READY' },
  { value: 'in_progress', label: 'IN PROGRESS' },
] as const;

type Props = {
  epics: Epic[];
  workspaceId: string;
  projectId: string;
};

export function CreateEpicContextBoard({ epics, workspaceId, projectId }: Props) {
  return (
    <section className={styles.board} aria-label="Epic workflow board" data-node-id="347:259">
      <h2>Project Board · Epics</h2>
      {previewStatuses.map(({ value, label }) => {
        const statusEpics = epics.filter((epic) => epic.status === value);
        return (
          <div className={styles.lane} key={value}>
            <span className={styles.status}>{label}</span>
            <div className={styles.cards}>
              {statusEpics.map((epic) => (
                <Link
                  className={styles.epicCard}
                  key={epic.id}
                  to={`/planning/${workspaceId}/${projectId}/epics/${epic.id}`}
                >
                  <span>{epic.title}</span>
                  <small>
                    {epic.features.length} {epic.features.length === 1 ? 'work item' : 'work items'}
                  </small>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
