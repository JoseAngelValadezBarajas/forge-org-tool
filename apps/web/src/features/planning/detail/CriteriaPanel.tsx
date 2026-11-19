import { ButtonV2, CardV2, TextInputV2 } from '@corefoundry-labs/forge-ui';
import { CriterionItem } from '../components';
import styles from '../FeatureDetailPage.module.css';
import type { FeatureDetailModel } from './model';

type Props = Pick<
  FeatureDetailModel,
  | 'criteria'
  | 'archived'
  | 'editingCriterionId'
  | 'setEditingCriterionId'
  | 'criterionDraft'
  | 'setCriterionDraft'
  | 'updateCriterion'
  | 'moveCriterion'
  | 'removeCriterion'
  | 'addCriterion'
  | 'criterion'
  | 'setCriterion'
>;

export function CriteriaPanel({
  criteria,
  archived,
  editingCriterionId,
  setEditingCriterionId,
  criterionDraft,
  setCriterionDraft,
  updateCriterion,
  moveCriterion,
  removeCriterion,
  addCriterion,
  criterion,
  setCriterion,
}: Props) {
  return (
    <CardV2
      variant="outlined"
      as="section"
      aria-label="Acceptance criteria"
      className={styles.criteriaCard}
    >
      <div className={styles.sectionHeading}>
        <div>
          <h2>
            Acceptance criteria{' '}
            <span className={styles.count}>
              {criteria.filter((item) => item.satisfied).length} / {criteria.length}
            </span>
          </h2>
        </div>
      </div>
      {criteria.length === 0 ? (
        <p className={styles.muted}>No acceptance criteria yet.</p>
      ) : (
        <ul className={styles.list}>
          {criteria.map((item, index) => (
            <CriterionItem
              key={item.id}
              criterion={item}
              compact
              archived={archived}
              onSatisfiedChange={(satisfied) => void updateCriterion(item.id, { satisfied })}
            >
              {editingCriterionId === item.id ? (
                <div className={styles.inlineEditor}>
                  <TextInputV2
                    aria-label={`Edit criterion ${item.description}`}
                    value={criterionDraft}
                    onChange={(event) => setCriterionDraft(event.target.value)}
                  />
                  <ButtonV2
                    type="button"
                    onClick={() => {
                      void updateCriterion(item.id, { description: criterionDraft });
                      setEditingCriterionId(null);
                    }}
                  >
                    Save criterion
                  </ButtonV2>
                  <ButtonV2
                    type="button"
                    variant="secondary"
                    onClick={() => setEditingCriterionId(null)}
                  >
                    Cancel
                  </ButtonV2>
                </div>
              ) : (
                !archived && (
                  <div className={styles.inlineActions}>
                    <details className={styles.criterionMoreActions}>
                      <summary>More criterion actions</summary>
                      <div className={styles.criterionMoreActionsMenu}>
                        <ButtonV2
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            setCriterionDraft(item.description);
                            setEditingCriterionId(item.id);
                          }}
                        >
                          Edit
                        </ButtonV2>
                        <ButtonV2
                          type="button"
                          variant="secondary"
                          disabled={index === 0}
                          onClick={() => void moveCriterion(index, -1)}
                        >
                          Move up
                        </ButtonV2>
                        <ButtonV2
                          type="button"
                          variant="secondary"
                          disabled={index === criteria.length - 1}
                          onClick={() => void moveCriterion(index, 1)}
                        >
                          Move down
                        </ButtonV2>
                        <ButtonV2
                          type="button"
                          variant="secondary"
                          onClick={() => void removeCriterion(item.id)}
                        >
                          Delete
                        </ButtonV2>
                      </div>
                    </details>
                  </div>
                )
              )}
            </CriterionItem>
          ))}
        </ul>
      )}
      {!archived && (
        <details className={styles.addDetails}>
          <summary>Add acceptance criterion</summary>
          <form onSubmit={addCriterion}>
            <label htmlFor="criterion-title">Acceptance criterion</label>
            <TextInputV2
              id="criterion-title"
              aria-label="Acceptance criterion"
              value={criterion}
              onChange={(event) => setCriterion(event.target.value)}
              required
            />
            <ButtonV2 type="submit">Add criterion</ButtonV2>
          </form>
        </details>
      )}
    </CardV2>
  );
}
