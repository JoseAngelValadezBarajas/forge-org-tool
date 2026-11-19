import { Link } from 'react-router-dom';
import { CardV2 } from '@corefoundry-labs/forge-ui';
import type { Feature } from '@forge-org/api-client';
import styles from '../FeatureDetailPage.module.css';
import { titleCase, type FeatureDetailModel } from './model';

type Props = Pick<FeatureDetailModel, 'workspaceId' | 'projectId' | 'selectedTags' | 'epicName'> & {
  feature: Feature;
};

export function StoryProperties({
  feature,
  workspaceId,
  projectId,
  selectedTags,
  epicName,
}: Props) {
  return (
    <>
      <CardV2
        variant="outlined"
        as="section"
        aria-label="Properties"
        className={styles.propertiesCard}
      >
        <h2>Properties</h2>
        <dl className={styles.properties}>
          <div>
            <dt>Epic</dt>
            <dd>
              {feature.epic_id ? (
                <Link to={`/planning/${workspaceId}/${projectId}/epics/${feature.epic_id}`}>
                  {epicName}
                </Link>
              ) : (
                'Unassigned'
              )}
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{titleCase(feature.status)}</dd>
          </div>
          <div>
            <dt>Priority</dt>
            <dd>{titleCase(feature.priority)}</dd>
          </div>
          <div>
            <dt>Tags</dt>
            <dd>{selectedTags.length ? selectedTags.join(', ') : 'No tags'}</dd>
          </div>
        </dl>
      </CardV2>
    </>
  );
}

export function StoryQuickActions({
  feature,
  workspaceId,
  projectId,
}: Pick<Props, 'feature' | 'workspaceId' | 'projectId'>) {
  return (
    <CardV2
      data-layout="flow"
      variant="outlined"
      as="section"
      aria-label="Quick actions"
      className={styles.quickActions}
    >
      <h2>Quick actions</h2>
      {feature.epic_id && (
        <Link to={`/transfer/${workspaceId}/${projectId}/work-items/${feature.epic_id}`}>
          Export Work Items ↗
        </Link>
      )}
      <Link to={`/transfer/${workspaceId}/${projectId}/tasks/${feature.id}`}>
        Import / export Tasks ↗
      </Link>
    </CardV2>
  );
}
