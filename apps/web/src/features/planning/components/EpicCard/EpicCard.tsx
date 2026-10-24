import type { DragEventHandler, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card, StatusChip } from '@corefoundry-labs/forge-ui';
import type { Epic, EpicStatus, Feature } from '@forge-org/api-client';
import styles from './EpicCard.module.css';

type EpicCardProps = {
  epic: Epic & { features: Feature[] };
  children?: ReactNode;
  href?: string;
  compact?: boolean;
  draggable?: boolean;
  onDragStart?: DragEventHandler<HTMLDivElement>;
};

const labels: Record<EpicStatus, string> = {
  backlog: 'Backlog',
  ready: 'Ready',
  in_progress: 'In progress',
  verify: 'Verify',
  done: 'Done',
};

export function EpicCard({
  epic,
  children,
  href,
  compact = false,
  draggable = false,
  onDragStart,
}: EpicCardProps) {
  const knownStatus = epic.status in labels;
  const label = epic.archived_at
    ? 'Archived'
    : knownStatus
      ? labels[epic.status as EpicStatus]
      : `Legacy status: ${epic.status}`;
  const state = epic.archived_at ? 'Archived' : knownStatus ? epic.status : 'legacy';
  const total = epic.feature_count ?? epic.features.length;
  const completed =
    epic.completed_feature_count ??
    epic.features.filter((item: Feature) => item.status === 'done').length;
  const progress = epic.progress ?? (total ? Math.round((completed / total) * 100) : 0);
  if (compact) {
    return (
      <Card
        className={`${styles.card} ${styles.compact}`}
        data-state={state}
        data-testid={`epic-card-${epic.id}`}
        draggable={draggable}
        onDragStart={onDragStart}
      >
        <p className={styles.compactType}>{`EPIC · ${epic.priority ?? 'medium'}`}</p>
        <h4 className={styles.compactTitle}>
          {href ? <Link to={href}>{epic.title}</Link> : epic.title}
        </h4>
        <p className={styles.compactMeta}>
          {total} items{epic.tags?.[0] ? `  ·  ${epic.tags[0].toLowerCase()}` : ''}
        </p>
        {children}
      </Card>
    );
  }
  return (
    <Card className={styles.card} data-state={state}>
      <header className={styles.header}>
        <div>
          <h3>{href ? <Link to={href}>{epic.title}</Link> : epic.title}</h3>
          <p>
            {total} {total === 1 ? 'work item' : 'work items'} · {progress}% complete
          </p>
        </div>
        <StatusChip
          tone={
            state === 'done'
              ? 'success'
              : state === 'in_progress' || state === 'verify'
                ? 'accent'
                : 'neutral'
          }
        >
          {label}
        </StatusChip>
      </header>
      <p>Priority: {epic.priority ?? 'medium'}</p>
      {epic.description && <p className={styles.description}>{epic.description}</p>}
      {epic.tags?.length ? (
        <ul aria-label={`${epic.title} tags`}>
          {epic.tags.map((tag: string) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      ) : null}
      {children && <div className={styles.features}>{children}</div>}
    </Card>
  );
}
