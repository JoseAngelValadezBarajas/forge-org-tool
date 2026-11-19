import { Link } from 'react-router-dom';
import { ButtonV2, SelectV2, TextInputV2 } from '@corefoundry-labs/forge-ui';
import styles from '../PlanningPage.module.css';
import { PriorityOptions, StatusOptions } from '../components';
import type { PlanningModel } from './model';

type Props = Pick<
  PlanningModel,
  | 'workspaceId'
  | 'projectId'
  | 'workspaceTags'
  | 'setFeatureDialogOpen'
  | 'epicSearch'
  | 'setEpicSearch'
  | 'epicStatusFilter'
  | 'setEpicStatusFilter'
  | 'epicPriorityFilter'
  | 'setEpicPriorityFilter'
  | 'epicTagFilter'
  | 'setEpicTagFilter'
>;

export function EpicToolbar({
  workspaceId,
  projectId,
  workspaceTags,
  setFeatureDialogOpen,
  epicSearch,
  setEpicSearch,
  epicStatusFilter,
  setEpicStatusFilter,
  epicPriorityFilter,
  setEpicPriorityFilter,
  epicTagFilter,
  setEpicTagFilter,
}: Props) {
  return (
    <div className={styles.epicToolbar} aria-label="Epic board filters" data-node-id="344:118">
      <details className={styles.boardViewMenu}>
        <summary>Board&nbsp; ▾</summary>
        <div>
          <span aria-current="page">Epics</span>
          <Link to={`/projects/${workspaceId}/${projectId}`}>Project overview</Link>
          <ButtonV2 type="button" variant="ghost" onClick={() => setFeatureDialogOpen(true)}>
            New work item
          </ButtonV2>
          <p>Planning status and dependencies are manual product records only.</p>
        </div>
      </details>
      <TextInputV2
        size="sm"
        className={styles.epicSearch}
        type="search"
        aria-label="Search Epics"
        placeholder="Search Epics    ⌕"
        value={epicSearch}
        onChange={(event) => setEpicSearch(event.target.value)}
      />
      <SelectV2
        size="sm"
        className={`${styles.epicFilter} ${styles.epicStatusFilter}`}
        aria-label="Filter Epics by status"
        value={epicStatusFilter}
        onChange={(event) => setEpicStatusFilter(event.target.value)}
      >
        <option value="all">Status: All</option>
        <StatusOptions prefix="Status: " />
      </SelectV2>
      <SelectV2
        size="sm"
        className={`${styles.epicFilter} ${styles.epicPriorityFilter}`}
        aria-label="Filter Epics by priority"
        value={epicPriorityFilter}
        onChange={(event) => setEpicPriorityFilter(event.target.value)}
      >
        <option value="all">Priority&nbsp; ▾</option>
        <PriorityOptions capitalize />
      </SelectV2>
      <SelectV2
        size="sm"
        className={`${styles.epicFilter} ${styles.epicTagFilter}`}
        aria-label="Filter Epics by tag"
        value={epicTagFilter}
        onChange={(event) => setEpicTagFilter(event.target.value)}
      >
        <option value="">Tags&nbsp; ▾</option>
        {workspaceTags.map((tag) => (
          <option key={tag.id} value={tag.name}>
            {tag.name}
          </option>
        ))}
      </SelectV2>
      <Link
        className={`${styles.epicFilter} ${styles.importEpic}`}
        to={`/transfer/${workspaceId}/${projectId}/epics/${projectId}`}
      >
        ⇩ Import Epic
      </Link>
    </div>
  );
}
