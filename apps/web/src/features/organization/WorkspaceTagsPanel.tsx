import { useEffect, useState, type FormEvent } from 'react';
import { organizationApi, type WorkspaceTag } from '@forge-org/api-client';
import { AlertV2, ButtonV2, CardV2, FormField, TextInputV2 } from '@corefoundry-labs/forge-ui';
import styles from './WorkspaceTagsPanel.module.css';

type Draft = { name: string; color: string };

export function WorkspaceTagsPanel({ workspaceId }: { workspaceId: string }) {
  const [tags, setTags] = useState<WorkspaceTag[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6b7280');
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    if (workspaceId) {
      void organizationApi
        .listWorkspaceTags(workspaceId)
        .then((items) => {
          if (!current) return;
          setTags(items);
          setDrafts(
            Object.fromEntries(items.map((tag) => [tag.id, { name: tag.name, color: tag.color }])),
          );
        })
        .catch((cause: unknown) => {
          if (current)
            setError(cause instanceof Error ? cause.message : 'Unable to load workspace tags.');
        });
    }
    return () => {
      current = false;
    };
  }, [workspaceId]);

  async function createTag(event: FormEvent) {
    event.preventDefault();
    if (!workspaceId || !name.trim()) return;
    try {
      const tag = await organizationApi.createWorkspaceTag(workspaceId, name, color);
      setTags((items) => [...items, tag].sort((a, b) => a.name.localeCompare(b.name)));
      setDrafts((items) => ({ ...items, [tag.id]: { name: tag.name, color: tag.color } }));
      setName('');
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create workspace tag.');
    }
  }

  async function saveTag(tagId: string) {
    const draft = drafts[tagId];
    if (!draft) return;
    try {
      const updated = await organizationApi.updateWorkspaceTag(workspaceId, tagId, draft);
      setTags((items) =>
        items
          .map((tag) => (tag.id === tagId ? updated : tag))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update workspace tag.');
    }
  }

  async function deleteTag(tagId: string) {
    try {
      await organizationApi.deleteWorkspaceTag(workspaceId, tagId);
      setTags((items) => items.filter((tag) => tag.id !== tagId));
      setDrafts((items) =>
        Object.fromEntries(Object.entries(items).filter(([id]) => id !== tagId)),
      );
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to delete workspace tag.');
    }
  }

  if (!workspaceId) return null;
  return (
    <CardV2 variant="outlined">
      <div className={styles.layout}>
        <section aria-labelledby="workspace-tags-heading" className={styles.catalog}>
          <h2 id="workspace-tags-heading">Manage workspace tags</h2>
          <p>
            Tags are shared across this Workspace. Removing a tag never deletes its Epics or Work
            Items.
          </p>
          {error && <AlertV2 tone="error">{error}</AlertV2>}
          <form onSubmit={createTag}>
            <FormField label="New tag name">
              <TextInputV2
                aria-label="New tag name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={40}
              />
            </FormField>
            <FormField label="New tag color">
              <TextInputV2
                aria-label="New tag color"
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
              />
            </FormField>
            <ButtonV2 type="submit">Create workspace tag</ButtonV2>
          </form>
          {tags.length === 0 ? (
            <p>No workspace tags yet.</p>
          ) : (
            <ul>
              {tags.map((tag) => {
                const draft = drafts[tag.id] ?? { name: tag.name, color: tag.color };
                return (
                  <li key={tag.id}>
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        void saveTag(tag.id);
                      }}
                    >
                      <FormField label={`Name for tag ${tag.name}`}>
                        <TextInputV2
                          aria-label={`Name for tag ${tag.name}`}
                          value={draft.name}
                          maxLength={40}
                          onChange={(event) =>
                            setDrafts((items) => ({
                              ...items,
                              [tag.id]: { ...draft, name: event.target.value },
                            }))
                          }
                          required
                        />
                      </FormField>
                      <FormField label={`Color for tag ${tag.name}`}>
                        <TextInputV2
                          aria-label={`Color for tag ${tag.name}`}
                          type="color"
                          value={draft.color}
                          onChange={(event) =>
                            setDrafts((items) => ({
                              ...items,
                              [tag.id]: { ...draft, color: event.target.value },
                            }))
                          }
                        />
                      </FormField>
                      <ButtonV2 type="submit">Save tag {tag.name}</ButtonV2>
                      <ButtonV2
                        type="button"
                        variant="secondary"
                        onClick={() => void deleteTag(tag.id)}
                      >
                        Delete tag {tag.name}
                      </ButtonV2>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <aside aria-labelledby="tag-guidance-heading" className={styles.guidance}>
          <h3 id="tag-guidance-heading">Tag guidance</h3>
          <p>Keep tags short and consistent so teams can filter related work quickly.</p>
          <ul>
            <li>Tags are shared by every project in this Workspace.</li>
            <li>Renaming a tag updates its label without deleting linked work.</li>
            <li>Deleting a tag removes only the label, never an Epic or Work Item.</li>
          </ul>
        </aside>
      </div>
    </CardV2>
  );
}
