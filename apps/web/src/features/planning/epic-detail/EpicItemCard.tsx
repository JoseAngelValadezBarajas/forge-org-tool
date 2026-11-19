import { type Feature } from '@forge-org/api-client';
import { Link } from 'react-router-dom';
import { CardV2, SelectV2 } from '@corefoundry-labs/forge-ui';
import { PLANNING_COLUMN_STATUSES } from '../components/KanbanColumn/KanbanColumn';
import { PriorityOptions, StatusOptions } from '../components';
import styles from '../EpicDetailPage.module.css';
import type { EpicDetailModel } from './model';

type Props = Pick<
  EpicDetailModel,
  | 'workspaceId'
  | 'projectId'
  | 'isMobile'
  | 'mobileCardDetails'
  | 'moveFeature'
  | 'readOnly'
  | 'featurePointerDrag'
> & {
  feature: Feature;
};

export function EpicItemCard({
  workspaceId,
  projectId,
  isMobile,
  mobileCardDetails,
  moveFeature,
  readOnly,
  featurePointerDrag,
  feature,
}: Props) {
  return (
    <CardV2
      data-layout="flow"
      variant="outlined"
      as="article"
      key={feature.id}
      aria-label={feature.title}
      className={styles.itemCard}
      data-dragging={featurePointerDrag.draggingId === feature.id ? 'true' : undefined}
      draggable={false}
      onPointerDown={!readOnly ? (event) => featurePointerDrag.start(feature.id, event) : undefined}
      onDragStart={(event) => {
        event.dataTransfer.setData('text/forge-feature-id', feature.id);
        event.dataTransfer.setData('text/plain', feature.id);
        event.dataTransfer.effectAllowed = 'move';
      }}
    >
      <p className={styles.itemKind}>
        {feature.kind === 'bug' ? 'Bug' : 'Story'} · {feature.priority}
      </p>
      <Link
        className={styles.itemTitle}
        draggable={false}
        onDragStart={(event) => {
          event.dataTransfer.setData('text/forge-feature-id', feature.id);
          event.dataTransfer.setData('text/plain', feature.id);
          event.dataTransfer.effectAllowed = 'move';
        }}
        to={`/planning/${workspaceId}/${projectId}/features/${feature.id}`}
      >
        {feature.title}
      </Link>
      <p className={styles.itemTags}>
        {isMobile
          ? [
              mobileCardDetails[feature.id],
              feature.kind === 'bug'
                ? `${feature.status.charAt(0).toUpperCase()}${feature.status.slice(1)}`
                : feature.tags?.join(', '),
            ]
              .filter(Boolean)
              .join(' · ')
          : feature.tags?.join(' · ') || 'No tags'}
      </p>
      {!readOnly && (
        <details className={styles.itemActions}>
          <summary>Move</summary>
          <div className={styles.itemControls}>
            <label>
              Priority
              <SelectV2
                size="sm"
                aria-label={`Priority for ${feature.title}`}
                value={feature.priority}
                onChange={(event) =>
                  void moveFeature(feature, { priority: event.target.value as Feature['priority'] })
                }
              >
                <PriorityOptions />
              </SelectV2>
            </label>
            <label>
              Move to status
              <SelectV2
                size="sm"
                aria-label={`Status for ${feature.title}`}
                value={feature.status}
                onChange={(event) =>
                  void moveFeature(feature, { status: event.target.value as Feature['status'] })
                }
              >
                <StatusOptions />
                {!PLANNING_COLUMN_STATUSES.some((column) => column.value === feature.status) && (
                  <option value={feature.status}>Unsupported: {feature.status}</option>
                )}
              </SelectV2>
            </label>
          </div>
        </details>
      )}
    </CardV2>
  );
}
