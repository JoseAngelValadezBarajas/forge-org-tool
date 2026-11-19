import { type EpicStatus } from '@forge-org/api-client';
import { statuses } from '../useEpicDetailController';
import { ButtonV2, DialogV2, SelectV2, TextInputV2, Textarea } from '@corefoundry-labs/forge-ui';
import styles from '../EpicDetailPage.module.css';
import type { EpicDetailModel } from './model';

type Props = Pick<
  EpicDetailModel,
  | 'title'
  | 'setTitle'
  | 'description'
  | 'setDescription'
  | 'status'
  | 'setStatus'
  | 'editing'
  | 'setEditing'
  | 'save'
>;

export function EpicEditDialog({
  title,
  setTitle,
  description,
  setDescription,
  status,
  setStatus,
  editing,
  setEditing,
  save,
}: Props) {
  return (
    <DialogV2
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setEditing(false);
      }}
      title="Edit Epic"
      description="Update the Epic summary and workflow status."
      open={editing}
    >
      <form className={styles.form} onSubmit={save}>
        <label htmlFor="epic-title">Epic title</label>
        <TextInputV2
          id="epic-title"
          aria-label="Epic title"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <label htmlFor="epic-description">Description</label>
        <Textarea
          id="epic-description"
          aria-label="Epic description"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <label htmlFor="epic-status">Status</label>
        <SelectV2
          size="sm"
          id="epic-status"
          aria-label="Epic status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          {!statuses.includes(status as EpicStatus) && (
            <option value={status}>Unsupported: {status}</option>
          )}
          {statuses.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </SelectV2>
        <div className={styles.formActions}>
          <ButtonV2 type="button" variant="secondary" onClick={() => setEditing(false)}>
            Cancel
          </ButtonV2>
          <ButtonV2 type="submit">Save Epic</ButtonV2>
        </div>
      </form>
    </DialogV2>
  );
}
