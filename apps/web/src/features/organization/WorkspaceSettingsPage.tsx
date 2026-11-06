import { Link } from 'react-router-dom';
import {
  Button,
  Card,
  Dialog,
  FormField,
  Input,
  StatusChip,
  Textarea,
} from '@corefoundry-labs/forge-ui';
import styles from './WorkspaceSettingsPage.module.css';
import { useWorkspaceSettingsController } from './useWorkspaceSettingsController';

export function WorkspaceSettingsPage() {
  const {
    workspace,
    name,
    setName,
    description,
    setDescription,
    tags,
    tagUsage,
    tagUsageLoading,
    tagDrafts,
    setTagDrafts,
    newTagName,
    setNewTagName,
    newTagColor,
    setNewTagColor,
    newTagOpen,
    setNewTagOpen,
    editingTagId,
    setEditingTagId,
    error,
    loading,
    saveWorkspace,
    toggleArchive,
    createTag,
    saveTag,
    deleteTag,
  } = useWorkspaceSettingsController();

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
