import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { organizationApi, type Workspace, type WorkspaceTag } from '@forge-org/api-client';
import { Button, Card, Dialog, FormField, Input, StatusChip, Textarea } from '@forge-org/ui';
import styles from './WorkspaceSettingsPage.module.css';

type TagDraft = Pick<WorkspaceTag, 'name' | 'color'>;

export function WorkspaceSettingsPage() {
  const { workspaceId = '' } = useParams();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<WorkspaceTag[]>([]);
  const [tagUsage, setTagUsage] = useState<Record<string, number>>({});
  const [tagUsageLoading, setTagUsageLoading] = useState(false);
  const [tagDrafts, setTagDrafts] = useState<Record<string, TagDraft>>({});
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6b7280');
  const [newTagOpen, setNewTagOpen] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let current = true;
    void organizationApi
      .listWorkspaces()
      .then(async (items) => {
        const selected = items.find((item) => item.id === workspaceId) ?? null;
        if (!current) return;
        setWorkspace(selected);
        setName(selected?.name ?? '');
        setDescription(selected?.description ?? '');
        if (selected && !selected.archived_at) {
          const itemsForWorkspace = await organizationApi.listWorkspaceTags(selected.id);
          if (!current) return;
          setTags(itemsForWorkspace);
          setTagUsageLoading(itemsForWorkspace.length > 0);
          setTagDrafts(
            Object.fromEntries(
              itemsForWorkspace.map((tag) => [tag.id, { name: tag.name, color: tag.color }]),
            ),
          );
          void organizationApi
            .listProjects(selected.id, '', 'all')
            .then(async (projects) => {
              const overviews = await Promise.all(
                projects.map((project) =>
                  organizationApi.planningOverview(selected.id, project.id).catch(() => null),
                ),
              );
              if (!current) return;
              const counts = Object.fromEntries(itemsForWorkspace.map((tag) => [tag.name, 0]));
              for (const overview of overviews) {
                if (!overview) continue;
                const records = [
                  ...overview.epics,
                  ...overview.epics.flatMap((epic) => epic.features),
                  ...overview.unassigned_features,
                ];
                for (const record of records) {
                  for (const tag of record.tags ?? []) {
                    if (tag in counts) counts[tag] += 1;
                  }
                }
              }
              setTagUsage(counts);
            })
            .catch(() => {
              if (current) setTagUsage({});
            })
            .finally(() => {
              if (current) setTagUsageLoading(false);
            });
        } else {
          setTags([]);
          setTagDrafts({});
          setTagUsage({});
          setTagUsageLoading(false);
        }
      })
      .catch((cause: unknown) => {
        if (current)
          setError(cause instanceof Error ? cause.message : 'Unable to load Workspace settings.');
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [workspaceId]);

  async function saveWorkspace(event: FormEvent) {
    event.preventDefault();
    if (!workspace) return;
    try {
      const updated = await organizationApi.updateWorkspace(workspace.id, {
        name: name.trim(),
        description: description.trim() || null,
      });
      setWorkspace(updated);
      setName(updated.name);
      setDescription(updated.description ?? '');
      window.dispatchEvent(
        new CustomEvent('forge:workspace-updated', { detail: { workspace: updated } }),
      );
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save Workspace settings.');
    }
  }

  async function toggleArchive() {
    if (!workspace) return;
    try {
      const updated = await organizationApi.setWorkspaceStatus(
        workspace.id,
        !workspace.archived_at,
      );
      setWorkspace(updated);
      if (updated.archived_at) {
        setTags([]);
        setTagDrafts({});
      } else {
        const items = await organizationApi.listWorkspaceTags(updated.id);
        setTags(items);
        setTagDrafts(
          Object.fromEntries(items.map((tag) => [tag.id, { name: tag.name, color: tag.color }])),
        );
      }
      window.dispatchEvent(
        new CustomEvent('forge:workspace-updated', { detail: { workspace: updated } }),
      );
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update Workspace status.');
    }
  }

  async function createTag(event: FormEvent) {
    event.preventDefault();
    if (!workspace || !newTagName.trim()) return;
    try {
      const created = await organizationApi.createWorkspaceTag(
        workspace.id,
        newTagName,
        newTagColor,
      );
      setTags((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setTagUsage((current) => ({ ...current, [created.name]: 0 }));
      setTagDrafts((current) => ({
        ...current,
        [created.id]: { name: created.name, color: created.color },
      }));
      setNewTagName('');
      setNewTagColor('#6b7280');
      setNewTagOpen(false);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create workspace tag.');
    }
  }

  async function saveTag(tagId: string) {
    const draft = tagDrafts[tagId];
    if (!draft || !workspace) return;
    try {
      const updated = await organizationApi.updateWorkspaceTag(workspace.id, tagId, draft);
      setTags((current) =>
        current
          .map((tag) => (tag.id === tagId ? updated : tag))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setTagUsage((current) => {
        const { [tagDrafts[tagId]?.name ?? updated.name]: previous, ...rest } = current;
        return { ...rest, [updated.name]: previous ?? 0 };
      });
      setTagDrafts((current) => ({
        ...current,
        [tagId]: { name: updated.name, color: updated.color },
      }));
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update workspace tag.');
    }
  }

  async function deleteTag(tagId: string) {
    if (!workspace) return;
    try {
      await organizationApi.deleteWorkspaceTag(workspace.id, tagId);
      const deletedName = tags.find((tag) => tag.id === tagId)?.name;
      setTags((current) => current.filter((tag) => tag.id !== tagId));
      if (deletedName) {
        setTagUsage((current) =>
          Object.fromEntries(
            Object.entries(current).filter(([name]) => name !== deletedName),
          ),
        );
      }
      setTagDrafts((current) =>
        Object.fromEntries(Object.entries(current).filter(([id]) => id !== tagId)),
      );
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to delete workspace tag.');
    }
  }

  if (loading) return <p role="status">Loading Workspace settings…</p>;
  if (!workspace) {
    return (
      <Card>
        <p role="alert">{error || 'Workspace not found.'}</p>
        <Link to="/">Back to Projects</Link>
      </Card>
    );
  }

  const newTagForm = (
    <form className={styles.newTagForm} onSubmit={(event) => void createTag(event)}>
      <FormField label="New tag name">
        <Input
          aria-label="New tag name"
          value={newTagName}
          onChange={(event) => setNewTagName(event.target.value)}
          required
          maxLength={40}
        />
      </FormField>
      <FormField label="New tag color">
        <Input
          aria-label="New tag color"
          type="color"
          value={newTagColor}
          onChange={(event) => setNewTagColor(event.target.value)}
        />
      </FormField>
      <Button type="submit">Create workspace tag</Button>
    </form>
  );
  const editorTags = [...tags].sort(
    (left, right) => Number(right.id === editingTagId) - Number(left.id === editingTagId),
  );

  return (
    <div className={styles.stack}>
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>WORKSPACE SETTINGS</span>
          <h1>Manage workspace tags</h1>
          <p>Create once, reuse across every Project, Epic, Story and Bug.</p>
        </div>
        {!workspace.archived_at && (
          <Button
            className={styles.newTag}
            aria-label="New tag"
            onClick={() => {
              setEditingTagId(null);
              setNewTagOpen(true);
            }}
          >
            + New Tag
          </Button>
        )}
      </header>
      {error && !newTagOpen && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {!workspace.archived_at ? (
        <div className={styles.tagsComposition} aria-label="Workspace tag composition">
          <Card as="section" aria-label={`Tags in ${workspace.name}`} className={styles.catalog}>
            <h2>Tags in {workspace.name}</h2>
            <p className={styles.catalogIntro}>
              Tags belong to a workspace and can be reused in all projects.
            </p>
            {tags.length === 0 ? (
              <p className={styles.noTags}>No workspace tags yet.</p>
            ) : (
              <ul className={styles.tagList}>
                {tags.map((tag) => {
                  return (
                    <li className={styles.tagRow} key={tag.id}>
                      <div className={styles.tagDisplay}>
                        <span
                          aria-hidden="true"
                          className={styles.tagSwatch}
                          style={{ backgroundColor: tag.color }}
                        />
                        <div>
                          <strong>{`# ${tag.name}`}</strong>
                          <span>
                            {tagUsageLoading
                              ? 'Usage loading…'
                              : `${tagUsage[tag.name] ?? 0} items`}
                          </span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        aria-label={`Edit tag ${tag.name}`}
                        onClick={() => {
                          setEditingTagId(tag.id);
                          setNewTagOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
          <aside className={styles.guidance} aria-labelledby="tag-guidance-heading">
            <h2 id="tag-guidance-heading">Consistency by design</h2>
            <p>
              Select existing workspace tags when creating an Epic, Story or Bug. New names are
              created here, not silently from a text field.
            </p>
            <h3>EXAMPLE</h3>
            <div className={styles.examples}>
              {tags.slice(0, 3).map((tag) => (
                <span key={tag.id}># {tag.name}</span>
              ))}
            </div>
            <p className={styles.note}>Deleting a tag never deletes the work items that used it.</p>
          </aside>
        </div>
      ) : (
        <Card className={styles.archivedNotice}>
          <StatusChip tone="warning">Archived</StatusChip>
          <h2>Manage workspace tags</h2>
          <p>Restore this Workspace to manage its shared tags.</p>
        </Card>
      )}

      <details className={styles.profileDetails}>
        <summary>Workspace profile and status</summary>
        <h2>Workspace profile</h2>
        <form onSubmit={(event) => void saveWorkspace(event)} className={styles.profileForm}>
          <FormField label="Workspace name">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={120}
            />
          </FormField>
          <FormField label="Description">
            <Textarea
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
            />
          </FormField>
          <div className={styles.profileActions}>
            <Button type="submit">Save Workspace</Button>
            <Button type="button" variant="secondary" onClick={() => void toggleArchive()}>
              {workspace.archived_at ? 'Restore Workspace' : 'Archive Workspace'}
            </Button>
          </div>
        </form>
      </details>

      <Dialog
        title="Edit workspace tags"
        description="Create, rename, recolor or remove shared workspace tags."
        open={newTagOpen}
        onClose={() => setNewTagOpen(false)}
        onCancel={() => setNewTagOpen(false)}
      >
        {error && <p role="alert">{error}</p>}
        <div className={styles.tagEditor}>
          {!editingTagId && newTagForm}
          {editorTags.map((tag) => {
            const draft = tagDrafts[tag.id] ?? { name: tag.name, color: tag.color };
            return (
              <form
                key={tag.id}
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveTag(tag.id);
                }}
              >
                <FormField label={`Name for tag ${tag.name}`}>
                  <Input
                    aria-label={`Name for tag ${tag.name}`}
                    value={draft.name}
                    maxLength={40}
                    onChange={(event) =>
                      setTagDrafts((current) => ({
                        ...current,
                        [tag.id]: { ...draft, name: event.target.value },
                      }))
                    }
                    required
                  />
                </FormField>
                <FormField label={`Color for tag ${tag.name}`}>
                  <Input
                    aria-label={`Color for tag ${tag.name}`}
                    type="color"
                    value={draft.color}
                    onChange={(event) =>
                      setTagDrafts((current) => ({
                        ...current,
                        [tag.id]: { ...draft, color: event.target.value },
                      }))
                    }
                  />
                </FormField>
                <Button type="submit">Save tag {tag.name}</Button>
                <Button type="button" variant="secondary" onClick={() => void deleteTag(tag.id)}>
                  Delete tag {tag.name}
                </Button>
              </form>
            );
          })}
          {editingTagId && newTagForm}
          <Button type="button" variant="secondary" onClick={() => setNewTagOpen(false)}>
            Done
          </Button>
        </div>
      </Dialog>
      <Link className={styles.backLink} to="/">
        Back to Projects
      </Link>
    </div>
  );
}
