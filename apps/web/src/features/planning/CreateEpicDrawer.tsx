import { useEffect, useRef, type FormEvent } from 'react';
import { Button, FormField, Input, Select, Textarea } from '@forge-org/ui';
import type { WorkspaceTag } from '@forge-org/api-client';
import styles from './CreateEpicDrawer.module.css';

type Props = {
  projectName: string;
  title: string;
  onTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  priority: string;
  onPriorityChange: (value: string) => void;
  tags: string;
  onTagsChange: (value: string) => void;
  workspaceTags: WorkspaceTag[];
  tagCatalogError: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export function CreateEpicDrawer({
  projectName,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  priority,
  onPriorityChange,
  tags,
  onTagsChange,
  workspaceTags,
  tagCatalogError,
  onSubmit,
  onCancel,
}: Props) {
  const drawerRef = useRef<HTMLElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleInputRef.current?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && drawerRef.current?.contains(document.activeElement)) {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onCancel]);

  return (
    <section
      ref={drawerRef}
      className={styles.drawer}
      role="dialog"
      aria-modal="false"
      aria-labelledby="create-epic-heading"
      data-node-id="347:282"
    >
      <p className={styles.eyebrow}>CREATE IN {projectName}</p>
      <h2 id="create-epic-heading">New Epic</h2>
      <p className={styles.description}>An Epic groups Stories, Bugs and Tasks.</p>
      <form className={styles.form} onSubmit={onSubmit}>
        <FormField label="Epic title">
          <Input
            id="epic-title"
            placeholder="e.g. Behavioral Analytics"
            ref={titleInputRef}
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            required
          />
        </FormField>
        <FormField label="Description">
          <Textarea
            aria-label="Description"
            placeholder="What outcome are we working toward?"
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
          />
        </FormField>
        <FormField label="Priority">
          <Select
            aria-label="Priority"
            value={priority}
            onChange={(event) => onPriorityChange(event.target.value)}
          >
            {['low', 'medium', 'high', 'critical'].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </FormField>
        <fieldset className={styles.tagChoices}>
          <legend>Workspace tags</legend>
          {tagCatalogError && <p role="status">{tagCatalogError}</p>}
          {workspaceTags.map((tag) => (
            <label key={tag.id} className={styles.tagChoice}>
              <input
                type="checkbox"
                aria-label={`Epic tag ${tag.name}`}
                checked={tags
                  .split(',')
                  .map((value) => value.trim())
                  .includes(tag.name)}
                onChange={(event) => {
                  const selected = tags
                    .split(',')
                    .map((value) => value.trim())
                    .filter(Boolean);
                  onTagsChange(
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
          {workspaceTags.length === 0 && !tagCatalogError && <p>No workspace tags yet.</p>}
        </fieldset>
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className={styles.submitButton}>
            Create Epic
          </Button>
        </div>
      </form>
    </section>
  );
}
