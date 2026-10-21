import type { ReactNode } from 'react';
import { Card, StatusChip } from '@forge-org/ui';
import type { Observation, Repository } from '@forge-org/api-client';
import styles from './RepositoryCard.module.css';

type RepositoryCardProps = {
  repository: Repository;
  observation?: Observation;
  children?: ReactNode;
};

export function RepositoryCard({ repository, observation, children }: RepositoryCardProps) {
  const connected = repository.status === 'connected';
  const state = !connected ? 'Unavailable' : observation ? 'Observed' : 'Connected';
  return (
    <Card className={styles.card} data-state={state}>
      <header className={styles.heading}>
        <strong className={styles.path}>{repository.root_path}</strong>
        <StatusChip tone={connected ? 'success' : 'neutral'}>{repository.status}</StatusChip>
      </header>
      {observation ? (
        <>
          <p>
            Latest observation: {observation.unborn ? 'unborn' : (observation.branch ?? 'detached')}
            {' · source content: '}
            {observation.source_content_read ? 'yes' : 'no'}
          </p>
          <dl className={styles.observation}>
            <div>
              <dt>Branch</dt>
              <dd>
                {observation.unborn
                  ? 'unborn'
                  : (observation.branch ?? (observation.detached ? 'detached' : 'unknown'))}
              </dd>
            </div>
            <div>
              <dt>Observed HEAD</dt>
              <dd>{observation.head_sha ?? 'not available'}</dd>
            </div>
            <div>
              <dt>Source content</dt>
              <dd>{observation.source_content_read ? 'read' : 'not read'}</dd>
            </div>
            <div>
              <dt>Working tree</dt>
              <dd>
                {observation.clean === null
                  ? 'unknown'
                  : observation.clean
                    ? 'clean'
                    : 'changes present'}
              </dd>
            </div>
          </dl>
        </>
      ) : (
        <p className={styles.pending}>No metadata observation has been recorded.</p>
      )}
      {children && <div className={styles.actions}>{children}</div>}
    </Card>
  );
}
