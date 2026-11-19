import {
  ButtonV2,
  DialogV2,
  MultiSelect,
  SelectV2,
  TextInputV2,
  Textarea,
} from '@corefoundry-labs/forge-ui';
import { PriorityOptions } from '../components';
import styles from '../EpicDetailPage.module.css';
import type { EpicDetailModel } from './model';

type Props = Pick<
  EpicDetailModel,
  | 'epic'
  | 'createItemOpen'
  | 'setCreateItemOpen'
  | 'newItemTitle'
  | 'setNewItemTitle'
  | 'newItemKind'
  | 'setNewItemKind'
  | 'newItemTags'
  | 'setNewItemTags'
  | 'newBugSeverity'
  | 'setNewBugSeverity'
  | 'newBugSteps'
  | 'setNewBugSteps'
  | 'newBugExpected'
  | 'setNewBugExpected'
  | 'newBugActual'
  | 'setNewBugActual'
  | 'workspaceTags'
  | 'createWorkItem'
>;

export function WorkItemCreateDialog({
  epic,
  createItemOpen,
  setCreateItemOpen,
  newItemTitle,
  setNewItemTitle,
  newItemKind,
  setNewItemKind,
  newItemTags,
  setNewItemTags,
  newBugSeverity,
  setNewBugSeverity,
  newBugSteps,
  setNewBugSteps,
  newBugExpected,
  setNewBugExpected,
  newBugActual,
  setNewBugActual,
  workspaceTags,
  createWorkItem,
}: Props) {
  return (
    <DialogV2
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setCreateItemOpen(false);
      }}
      title="Create Work Item"
      description={`Add a Story or Bug to ${epic.title}.`}
      open={createItemOpen}
    >
      <form className={styles.form} onSubmit={(event) => void createWorkItem(event)}>
        <fieldset className={styles.kindChoice}>
          <legend>Work Item type</legend>
          {(['story', 'bug'] as const).map((kind) => (
            <ButtonV2
              key={kind}
              type="button"
              variant={newItemKind === kind ? 'primary' : 'secondary'}
              aria-pressed={newItemKind === kind}
              onClick={() => setNewItemKind(kind)}
            >
              {kind === 'story' ? 'Story' : 'Bug'}
            </ButtonV2>
          ))}
        </fieldset>
        <label htmlFor="new-work-item-title">Title</label>
        <TextInputV2
          id="new-work-item-title"
          aria-label="Work Item title"
          value={newItemTitle}
          onChange={(event) => setNewItemTitle(event.target.value)}
          required
        />
        <MultiSelect
          label="Workspace tags"
          options={workspaceTags.map((tag) => ({ value: tag.name, label: tag.name }))}
          value={newItemTags}
          onValuesChange={setNewItemTags}
          presentation="checkboxList"
          emptyMessage="No workspace tags available. Manage tags in Workspace settings."
        />
        {newItemKind === 'bug' && (
          <>
            <label htmlFor="new-bug-severity">Bug severity</label>
            <SelectV2
              size="sm"
              id="new-bug-severity"
              value={newBugSeverity}
              onChange={(event) => setNewBugSeverity(event.target.value)}
            >
              <PriorityOptions />
            </SelectV2>
            <label htmlFor="new-bug-steps">Steps to reproduce</label>
            <Textarea
              id="new-bug-steps"
              value={newBugSteps}
              onChange={(event) => setNewBugSteps(event.target.value)}
              rows={3}
            />
            <label htmlFor="new-bug-expected">Expected result</label>
            <Textarea
              id="new-bug-expected"
              value={newBugExpected}
              onChange={(event) => setNewBugExpected(event.target.value)}
              rows={2}
            />
            <label htmlFor="new-bug-actual">Actual result</label>
            <Textarea
              id="new-bug-actual"
              value={newBugActual}
              onChange={(event) => setNewBugActual(event.target.value)}
              rows={2}
            />
          </>
        )}
        <div className={styles.formActions}>
          <ButtonV2 type="button" variant="secondary" onClick={() => setCreateItemOpen(false)}>
            Cancel
          </ButtonV2>
          <ButtonV2 type="submit">Create Work Item</ButtonV2>
        </div>
      </form>
    </DialogV2>
  );
}
