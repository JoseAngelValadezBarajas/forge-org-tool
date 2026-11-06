import type { DragEventHandler, PointerEventHandler, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BadgeV2, CardV2 } from '@corefoundry-labs/forge-ui';
import type { Epic, EpicStatus, Feature } from '@forge-org/api-client';
import styles from './EpicCard.module.css';

type EpicCardProps = {
  epic: Epic & { features: Feature[] };
  children?: ReactNode;
  href?: string;
  compact?: boolean;
  draggable?: boolean;
  pointerDrag?: boolean;
  onDragStart?: DragEventHandler<HTMLDivElement>;
  onPointerDown?: PointerEventHandler<HTMLElement>;
  dragging?: boolean;
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
  pointerDrag = false,
  onDragStart,
  onPointerDown,
  dragging = false,
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
      <CardV2
        data-layout="flow"
        variant="outlined"
        as="article"
        className={`${styles.card} ${styles.compact}`}
        data-state={state}
        data-testid={`epic-card-${epic.id}`}
        data-dragging={dragging ? 'true' : undefined}
        draggable={draggable && !pointerDrag}
        onDragStart={onDragStart}
        onPointerDown={onPointerDown}
      >
        <p className={styles.compactType}>{`EPIC · ${epic.priority ?? 'medium'}`}</p>
        <h4 className={styles.compactTitle}>
          {href ? (
            <Link
              draggable={draggable && !pointerDrag}
              onDragStart={(event) =>
                onDragStart?.(event as unknown as Parameters<DragEventHandler<HTMLDivElement>>[0])
              }
              to={href}
            >
              {epic.title}
            </Link>
          ) : (
            epic.title
          )}
        </h4>
        <p className={styles.compactMeta}>
          {total} items{epic.tags?.[0] ? `  ·  ${epic.tags[0].toLowerCase()}` : ''}
        </p>
        {children}
      </CardV2>
    );
  }
  return (
    <CardV2 data-layout="flow" variant="outlined" className={styles.card} data-state={state}>
      <header className={styles.header}>
        <div>
          <h3>{href ? <Link to={href}>{epic.title}</Link> : epic.title}</h3>
          <p>
            {total} {total === 1 ? 'work item' : 'work items'} · {progress}% complete
          </p>
        </div>
        <BadgeV2
          tone={
            state === 'done'
              ? 'success'
              : state === 'in_progress' || state === 'verify'
                ? 'primary'
                : 'neutral'
          }
        >
          {label}
        </BadgeV2>
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
    </CardV2>
  );
}
