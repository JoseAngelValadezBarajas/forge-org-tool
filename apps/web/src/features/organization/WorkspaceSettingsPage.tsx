import { Link } from 'react-router-dom';
import {
  AlertV2,
  BadgeV2,
  ButtonV2,
  CardV2,
  DialogV2,
  FeedbackStateV2,
  FormField,
  TextInputV2,
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

  if (loading) return <FeedbackStateV2 state="loading" title="Loading Workspace settings…" />;
  if (!workspace) {
    return (
      <CardV2>
        <AlertV2 tone="error">{error || 'Workspace not found.'}</AlertV2>
        <Link to="/">Back to Projects</Link>
      </CardV2>
    );
  }

  const newTagForm = (
    <form className={styles.newTagForm} onSubmit={(event) => void createTag(event)}>
      <FormField label="New tag name">
        <TextInputV2
          aria-label="New tag name"
          value={newTagName}
          onChange={(event) => setNewTagName(event.target.value)}
          required
          maxLength={40}
        />
      </FormField>
      <FormField label="New tag color">
        <TextInputV2
          aria-label="New tag color"
          type="color"
          value={newTagColor}
          onChange={(event) => setNewTagColor(event.target.value)}
        />
      </FormField>
      <ButtonV2 type="submit">Create workspace tag</ButtonV2>
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
          <ButtonV2
            className={styles.newTag}
            aria-label="New tag"
            onClick={() => {
              setEditingTagId(null);
              setNewTagOpen(true);
            }}
          >
            + New Tag
          </ButtonV2>
        )}
      </header>
      {error && !newTagOpen && (
        <AlertV2 className={styles.error} tone="error">
          {error}
        </AlertV2>
      )}
      {!workspace.archived_at ? (
        <div className={styles.tagsComposition} aria-label="Workspace tag composition">
          <CardV2 as="section" aria-label={`Tags in ${workspace.name}`} className={styles.catalog}>
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
                      <ButtonV2
                        type="button"
                        variant="ghost"
                        aria-label={`Edit tag ${tag.name}`}
                        onClick={() => {
                          setEditingTagId(tag.id);
                          setNewTagOpen(true);
                        }}
                      >
                        Edit
                      </ButtonV2>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardV2>
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
        <CardV2 className={styles.archivedNotice}>
          <BadgeV2 tone="warning">Archived</BadgeV2>
          <h2>Manage workspace tags</h2>
          <p>Restore this Workspace to manage its shared tags.</p>
        </CardV2>
      )}

      <details className={styles.profileDetails}>
        <summary>Workspace profile and status</summary>
        <h2>Workspace profile</h2>
        <form onSubmit={(event) => void saveWorkspace(event)} className={styles.profileForm}>
          <FormField label="Workspace name">
            <TextInputV2
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
            <ButtonV2 type="submit">Save Workspace</ButtonV2>
            <ButtonV2 type="button" variant="secondary" onClick={() => void toggleArchive()}>
              {workspace.archived_at ? 'Restore Workspace' : 'Archive Workspace'}
            </ButtonV2>
          </div>
        </form>
      </details>

      <DialogV2
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setNewTagOpen(false);
        }}
        title="Edit workspace tags"
        description="Create, rename, recolor or remove shared workspace tags."
        open={newTagOpen}
      >
        {error && <AlertV2 tone="error">{error}</AlertV2>}
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
                  <TextInputV2
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
                  <TextInputV2
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
                <ButtonV2 type="submit">Save tag {tag.name}</ButtonV2>
                <ButtonV2 type="button" variant="secondary" onClick={() => void deleteTag(tag.id)}>
                  Delete tag {tag.name}
                </ButtonV2>
              </form>
            );
          })}
          {editingTagId && newTagForm}
          <ButtonV2 type="button" variant="secondary" onClick={() => setNewTagOpen(false)}>
            Done
          </ButtonV2>
        </div>
      </DialogV2>
      <Link className={styles.backLink} to="/">
        Back to Projects
      </Link>
    </div>
  );
}
