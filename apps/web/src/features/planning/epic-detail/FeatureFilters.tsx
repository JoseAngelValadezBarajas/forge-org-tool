import { SelectV2, TextInputV2 } from '@corefoundry-labs/forge-ui';
import { PriorityOptions } from '../components';
import styles from '../EpicDetailPage.module.css';
import type { EpicDetailModel } from './model';

type Props = Pick<
  EpicDetailModel,
  | 'featureSearch'
  | 'setFeatureSearch'
  | 'featureKind'
  | 'setFeatureKind'
  | 'featurePriority'
  | 'setFeaturePriority'
  | 'featureTag'
  | 'setFeatureTag'
>;

export function FeatureFilters({
  featureSearch,
  setFeatureSearch,
  featureKind,
  setFeatureKind,
  featurePriority,
  setFeaturePriority,
  featureTag,
  setFeatureTag,
}: Props) {
  return (
    <div className={styles.filters} aria-label="Work item filters">
      <SelectV2
        size="sm"
        aria-label="Filter Work Items by type"
        value={featureKind}
        onChange={(event) => setFeatureKind(event.target.value)}
      >
        <option value="all">All items</option>
        <option value="story">Stories</option>
        <option value="bug">Bugs</option>
      </SelectV2>
      <TextInputV2
        size="sm"
        id="epic-board-search"
        aria-label="Find Work Items"
        placeholder="Search Stories & Bugs"
        value={featureSearch}
        onChange={(event) => setFeatureSearch(event.target.value)}
      />
      <SelectV2
        size="sm"
        id="epic-board-priority"
        aria-label="Filter Work Items by priority"
        value={featurePriority}
        onChange={(event) => setFeaturePriority(event.target.value)}
      >
        <option value="all">Priority</option>
        <PriorityOptions />
      </SelectV2>
      <TextInputV2
        size="sm"
        id="epic-board-tag"
        aria-label="Filter Work Items by tag"
        placeholder="Tags"
        value={featureTag}
        onChange={(event) => setFeatureTag(event.target.value)}
      />
    </div>
  );
}
