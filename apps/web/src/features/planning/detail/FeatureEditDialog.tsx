import { ButtonV2, DialogV2, SelectV2, TextInputV2, Textarea } from '@corefoundry-labs/forge-ui';
import type { Feature } from '@forge-org/api-client';
import { PriorityOptions } from '../components';
import styles from '../FeatureDetailPage.module.css';
import type { FeatureDetailModel } from './model';

type Props = Pick<
  FeatureDetailModel,
  | 'isBug'
  | 'reload'
  | 'setEditing'
  | 'submitFeature'
  | 'featureTitle'
  | 'setFeatureTitle'
  | 'featureDescription'
  | 'setFeatureDescription'
  | 'featureGoal'
  | 'setFeatureGoal'
  | 'notes'
  | 'setNotes'
  | 'bugSeverity'
  | 'setBugSeverity'
  | 'stepsToReproduce'
  | 'setStepsToReproduce'
  | 'expectedResult'
  | 'setExpectedResult'
  | 'actualResult'
  | 'setActualResult'
  | 'workspaceTags'
  | 'selectedTags'
  | 'legacyTags'
  | 'toggleTag'
> & { feature: Feature };

export function FeatureEditDialog({
  feature,
  isBug,
  reload,
  setEditing,
  submitFeature,
  featureTitle,
  setFeatureTitle,
  featureDescription,
  setFeatureDescription,
  featureGoal,
  setFeatureGoal,
  notes,
  setNotes,
  bugSeverity,
  setBugSeverity,
  stepsToReproduce,
  setStepsToReproduce,
  expectedResult,
  setExpectedResult,
  actualResult,
  setActualResult,
  workspaceTags,
  selectedTags,
  legacyTags,
  toggleTag,
}: Props) {
  return (
    <DialogV2
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          void reload();
          setEditing(false);
        }
      }}
      title={isBug ? 'Edit Bug' : 'Edit Story'}
      open
    >
      <form className={styles.editForm} onSubmit={(event) => void submitFeature(event)}>
        <label htmlFor="feature-detail-title">Title</label>
        <TextInputV2
          id="feature-detail-title"
          aria-label="Edit feature title"
          value={featureTitle}
          onChange={(event) => setFeatureTitle(event.target.value)}
          required
        />
        <label htmlFor="feature-detail-description">Description</label>
        <Textarea
          id="feature-detail-description"
          aria-label="Edit feature description"
          value={featureDescription}
          onChange={(event) => setFeatureDescription(event.target.value)}
          rows={4}
        />
        <label htmlFor="feature-detail-goal">Goal</label>
        <Textarea
          id="feature-detail-goal"
          aria-label="Edit feature goal"
          value={featureGoal}
          onChange={(event) => setFeatureGoal(event.target.value)}
          rows={3}
        />
        <label htmlFor="feature-detail-notes">Notes</label>
        <Textarea
          id="feature-detail-notes"
          aria-label="Work item notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={5}
        />
        {feature.kind === 'bug' && (
          <section className={styles.editSection} aria-label="Bug details">
            <label htmlFor="bug-severity">Severity</label>
            <SelectV2
              size="sm"
              id="bug-severity"
              aria-label="Bug severity"
              value={bugSeverity}
              onChange={(event) => setBugSeverity(event.target.value)}
            >
              <PriorityOptions />
            </SelectV2>
            <label htmlFor="steps-to-reproduce">Steps to reproduce</label>
            <Textarea
              id="steps-to-reproduce"
              aria-label="Steps to reproduce"
              value={stepsToReproduce}
              onChange={(event) => setStepsToReproduce(event.target.value)}
              rows={4}
            />
            <label htmlFor="expected-result">Expected result</label>
            <Textarea
              id="expected-result"
              aria-label="Expected result"
              value={expectedResult}
              onChange={(event) => setExpectedResult(event.target.value)}
              rows={3}
            />
            <label htmlFor="actual-result">Actual result</label>
            <Textarea
              id="actual-result"
              aria-label="Actual result"
              value={actualResult}
              onChange={(event) => setActualResult(event.target.value)}
              rows={3}
            />
          </section>
        )}
        <fieldset className={styles.tagPicker}>
          <legend>Workspace tags</legend>
          {workspaceTags.length ? (
            workspaceTags.map((tag) => (
              <label key={tag.id} className={styles.checkTag}>
                <input
                  type="checkbox"
                  checked={selectedTags.includes(tag.name)}
                  onChange={(event) => toggleTag(tag.name, event.target.checked)}
                />
                <span>{tag.name}</span>
              </label>
            ))
          ) : (
            <p className={styles.muted}>No workspace tags are available.</p>
          )}
          {legacyTags.length > 0 && (
            <p className={styles.muted}>
              Existing tags outside the catalog are preserved: {legacyTags.join(', ')}
            </p>
          )}
        </fieldset>
        <div className={styles.actions}>
          <ButtonV2 type="submit">Save changes</ButtonV2>
          <ButtonV2
            type="button"
            variant="secondary"
            onClick={() => {
              void reload();
              setEditing(false);
            }}
          >
            Cancel
          </ButtonV2>
        </div>
      </form>
    </DialogV2>
  );
}
