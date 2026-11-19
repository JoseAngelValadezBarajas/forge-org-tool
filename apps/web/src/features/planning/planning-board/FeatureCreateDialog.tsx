import {
  ButtonV2,
  DialogV2,
  FormField,
  SelectV2,
  TextInputV2,
  Textarea,
} from '@corefoundry-labs/forge-ui';
import styles from '../PlanningPage.module.css';
import { PriorityOptions } from '../components';
import type { PlanningModel } from './model';

type Props = Pick<
  PlanningModel,
  | 'workspaceTags'
  | 'setFeatureDialogOpen'
  | 'rememberFeatureCreateError'
  | 'createFeature'
  | 'actualResult'
  | 'bugSeverity'
  | 'featureEpicId'
  | 'featureKind'
  | 'featureTags'
  | 'featureTitle'
  | 'overview'
  | 'setFeatureTitle'
  | 'setFeatureEpicId'
  | 'setFeatureKind'
  | 'setFeatureTags'
  | 'setBugSeverity'
  | 'setStepsToReproduce'
  | 'setExpectedResult'
  | 'setActualResult'
  | 'stepsToReproduce'
  | 'expectedResult'
>;

export function FeatureCreateDialog({
  workspaceTags,
  setFeatureDialogOpen,
  rememberFeatureCreateError,
  createFeature,
  actualResult,
  bugSeverity,
  featureEpicId,
  featureKind,
  featureTags,
  featureTitle,
  overview,
  setFeatureTitle,
  setFeatureEpicId,
  setFeatureKind,
  setFeatureTags,
  setBugSeverity,
  setStepsToReproduce,
  setExpectedResult,
  setActualResult,
  stepsToReproduce,
  expectedResult,
}: Props) {
  return (
    <DialogV2
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setFeatureDialogOpen(false);
      }}
      open
      title="Create work item"
    >
      <form
        className={styles.dialogForm}
        onSubmit={(event) => {
          rememberFeatureCreateError();
          void createFeature(event);
        }}
      >
        <label htmlFor="feature-title">Feature title</label>
        <TextInputV2
          id="feature-title"
          value={featureTitle}
          onChange={(event) => setFeatureTitle(event.target.value)}
          required
        />
        <FormField label="Epic for new feature">
          <SelectV2
            size="sm"
            aria-label="Epic for new feature"
            value={featureEpicId}
            onChange={(event) => setFeatureEpicId(event.target.value)}
          >
            <option value="">Unassigned</option>
            {overview.epics.map((epic) => (
              <option key={epic.id} value={epic.id}>
                {epic.title}
              </option>
            ))}
          </SelectV2>
        </FormField>
        <fieldset className={styles.workItemType}>
          <legend>Work item type</legend>
          <div className={styles.workItemTypeButtons}>
            {(['story', 'bug'] as const).map((kind) => (
              <ButtonV2
                key={kind}
                type="button"
                variant={featureKind === kind ? 'primary' : 'secondary'}
                aria-pressed={featureKind === kind}
                onClick={() => setFeatureKind(kind)}
              >
                {kind === 'story' ? 'Story' : 'Bug'}
              </ButtonV2>
            ))}
          </div>
        </fieldset>
        <fieldset className={styles.tagChoices}>
          <legend>Work item tags</legend>
          {workspaceTags.map((tag) => (
            <label key={tag.id} className={styles.tagChoice}>
              <input
                type="checkbox"
                aria-label={`Work item tag ${tag.name}`}
                checked={featureTags
                  .split(',')
                  .map((value) => value.trim())
                  .includes(tag.name)}
                onChange={(event) => {
                  const selected = featureTags
                    .split(',')
                    .map((value) => value.trim())
                    .filter(Boolean);
                  setFeatureTags(
                    (event.target.checked
                      ? [...selected, tag.name]
                      : selected.filter((value) => value !== tag.name)
                    ).join(', '),
                  );
                }}
              />
              <span>{tag.name}</span>
            </label>
          ))}
          {workspaceTags.length === 0 && <p>No workspace tags yet.</p>}
        </fieldset>
        {featureKind === 'bug' && (
          <div aria-label="Bug details">
            <FormField label="Bug severity">
              <SelectV2
                size="sm"
                aria-label="Bug severity"
                value={bugSeverity}
                onChange={(event) => setBugSeverity(event.target.value as typeof bugSeverity)}
              >
                <PriorityOptions />
              </SelectV2>
            </FormField>
            <FormField label="Steps to reproduce">
              <Textarea
                aria-label="Steps to reproduce"
                value={stepsToReproduce}
                onChange={(event) => setStepsToReproduce(event.target.value)}
              />
            </FormField>
            <FormField label="Expected result">
              <Textarea
                aria-label="Expected result"
                value={expectedResult}
                onChange={(event) => setExpectedResult(event.target.value)}
              />
            </FormField>
            <FormField label="Actual result">
              <Textarea
                aria-label="Actual result"
                value={actualResult}
                onChange={(event) => setActualResult(event.target.value)}
              />
            </FormField>
          </div>
        )}
        <ButtonV2 type="submit">Create Feature</ButtonV2>
      </form>
    </DialogV2>
  );
}
