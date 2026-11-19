import { FormField, SelectV2 } from '@corefoundry-labs/forge-ui';
import styles from '../PlanningPage.module.css';
import { FeatureCard, StatusOptions } from '../components';
import type { PlanningModel } from './model';

type Props = Pick<
  PlanningModel,
  | 'workspaceId'
  | 'projectId'
  | 'setStatusFilter'
  | 'statusFilter'
  | 'updateFeature'
  | 'visibleFeatures'
>;

export function MobileWorkItemBoard({
  workspaceId,
  projectId,
  setStatusFilter,
  statusFilter,
  updateFeature,
  visibleFeatures,
}: Props) {
  return (
    <section aria-label="Mobile work item board" className={styles.mobileBoard}>
      <FormField label="Work item status">
        <SelectV2
          size="sm"
          aria-label="Mobile work item status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="refining">Legacy refining</option>
          <StatusOptions />
        </SelectV2>
      </FormField>
      <div className={styles.mobileCards}>
        {visibleFeatures.map((feature) => (
          <FeatureCard
            key={`mobile-${feature.id}`}
            feature={feature}
            href={`/planning/${workspaceId}/${projectId}/features/${feature.id}`}
          >
            <label>
              Move work item
              <SelectV2
                size="sm"
                aria-label={`Mobile status for ${feature.title}`}
                value={feature.status}
                onChange={(event) => void updateFeature(feature, { status: event.target.value })}
              >
                {feature.status === 'refining' && <option value="refining">Legacy refining</option>}
                <StatusOptions />
              </SelectV2>
            </label>
          </FeatureCard>
        ))}
        {visibleFeatures.length === 0 && <p>No work items match these filters.</p>}
      </div>
    </section>
  );
}
