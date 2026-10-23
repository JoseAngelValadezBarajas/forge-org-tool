import type { ReactNode } from 'react';
import { Card, StatusChip } from '@forge-org/ui';
import type { Epic, Feature } from '@forge-org/api-client';
import styles from './EpicCard.module.css';

type EpicCardProps = { epic: Epic & { features: Feature[] }; children?: ReactNode };

function progressState(features: Feature[]): 'Backlog' | 'InProgress' | 'Done' {
  if (features.length > 0 && features.every((feature) => feature.status === 'done')) return 'Done';
  if (features.some((feature) => feature.status !== 'backlog')) return 'InProgress';
  return 'Backlog';
}

export function EpicCard({ epic, children }: EpicCardProps) {
  const state = progressState(epic.features);
  const label = state === 'InProgress' ? 'In progress' : state;
  return (
    <Card className={styles.card} data-state={state}>
      <header className={styles.header}>
        <div>
          <h3>{epic.title}</h3>
          <p>
            {epic.features.length} {epic.features.length === 1 ? 'feature' : 'features'}
          </p>
        </div>
        <StatusChip
          tone={state === 'Done' ? 'success' : state === 'InProgress' ? 'accent' : 'neutral'}
        >
          {label}
        </StatusChip>
      </header>
      {epic.description && <p className={styles.description}>{epic.description}</p>}
      {children && <div className={styles.features}>{children}</div>}
    </Card>
  );
}
