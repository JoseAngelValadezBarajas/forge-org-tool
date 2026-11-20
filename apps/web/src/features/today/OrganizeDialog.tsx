import { useState, type FormEvent } from 'react';
import type { Epic, Project } from '@forge-org/api-client';
import {
  AlertV2,
  ButtonV2,
  DialogV2,
  FormField,
  SelectV2,
  TextInputV2,
} from '@corefoundry-labs/forge-ui';
import styles from './OrganizeDialog.module.css';
import { organizeDefaults, type OrganizeValues } from './organize';
import type { TodayItem } from './todayModel';

type Props = {
  item: TodayItem;
  projects: Project[];
  epicsByProject: Record<string, Epic[]>;
  saving: boolean;
  error: string;
  onSave: (values: OrganizeValues) => void;
  onClose: () => void;
};

/** Where a captured task belongs: project, Epic, type, priority and tags, in one place. */
export function OrganizeDialog({
  item,
  projects,
  epicsByProject,
  saving,
  error,
  onSave,
  onClose,
}: Props) {
  const [values, setValues] = useState<OrganizeValues>(() =>
    organizeDefaults(item.feature, item.projectId),
  );
  const epics = (epicsByProject[values.projectId] ?? []).filter((epic) => !epic.archived_at);
  const projectChanged = values.projectId !== item.projectId;
  const set = <K extends keyof OrganizeValues>(key: K, value: OrganizeValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  function submit(event: FormEvent) {
    event.preventDefault();
    onSave(values);
  }

  return (
    <DialogV2
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Organize task"
      description={item.feature.title}
    >
      <form className={styles.form} onSubmit={submit}>
        <FormField label="Project">
          <SelectV2
            size="sm"
            aria-label="Project"
            value={values.projectId}
            onChange={(event) =>
              setValues({ ...values, projectId: event.target.value, epicId: '' })
            }
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </SelectV2>
        </FormField>
        <FormField label="Epic">
          <SelectV2
            size="sm"
            aria-label="Epic"
            value={values.epicId}
            onChange={(event) => set('epicId', event.target.value)}
          >
            <option value="">No Epic</option>
            {epics.map((epic) => (
              <option key={epic.id} value={epic.id}>
                {epic.title}
              </option>
            ))}
          </SelectV2>
        </FormField>
        <div className={styles.pair}>
          <FormField label="Type">
            <SelectV2
              size="sm"
              aria-label="Type"
              value={values.kind}
              onChange={(event) => set('kind', event.target.value === 'bug' ? 'bug' : 'story')}
            >
              <option value="story">Story</option>
              <option value="bug">Bug</option>
            </SelectV2>
          </FormField>
          <FormField label="Priority">
            <SelectV2
              size="sm"
              aria-label="Priority"
              value={values.priority}
              onChange={(event) => set('priority', event.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </SelectV2>
          </FormField>
        </div>
        <FormField label="Tags" hint="Separate with commas.">
          <TextInputV2
            size="sm"
            aria-label="Tags"
            value={values.tags}
            onChange={(event) => set('tags', event.target.value)}
            autoComplete="off"
          />
        </FormField>
        {projectChanged && (
          <p className={styles.note}>
            Tasks, criteria and tags move with it. An item with dependencies cannot change project.
          </p>
        )}
        {error && <AlertV2 tone="error">{error}</AlertV2>}
        <div className={styles.actions}>
          <ButtonV2 type="button" variant="ghost" onClick={onClose}>
            Cancel
          </ButtonV2>
          <ButtonV2 type="submit" loading={saving}>
            Save
          </ButtonV2>
        </div>
      </form>
    </DialogV2>
  );
}
