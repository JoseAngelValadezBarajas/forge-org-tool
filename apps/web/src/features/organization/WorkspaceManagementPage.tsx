import { Link } from 'react-router-dom';
import {
  AlertV2,
  ButtonV2,
  CardV2,
  DialogV2,
  FeedbackStateV2,
  FormField,
  TextInputV2,
  Textarea,
} from '@corefoundry-labs/forge-ui';
import styles from './WorkspaceManagementPage.module.css';
import { useWorkspaceManagementController } from './useWorkspaceManagementController';

export function WorkspaceManagementPage() {
  const {
    workspaces,
    name,
    setName,
    description,
    setDescription,
    createOpen,
    setCreateOpen,
    workspaceToDelete,
    setWorkspaceToDelete,
    loading,
    saving,
    error,
    provider,
    createWorkspace,
    deleteWorkspace,
    openWorkspace,
  } = useWorkspaceManagementController();

  return (
    <div className={styles.stack}>
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>WORKSPACE</span>
          <h1>Manage workspaces</h1>
          <p>
            Workspaces in <strong>{provider === 'local' ? 'Local SQLite' : 'Supabase'}</strong>.
            Providers stay separate; switching Storage changes this list.
          </p>
        </div>
        <ButtonV2 type="button" onClick={() => setCreateOpen(true)}>
          New workspace
        </ButtonV2>
      </header>

      {error && (
        <AlertV2 tone="error" className={styles.error}>
          {error}
        </AlertV2>
      )}
      {loading ? (
        <FeedbackStateV2 state="loading" title="Loading workspaces…" />
      ) : workspaces.length === 0 ? (
        <CardV2 data-layout="flow" variant="outlined" className={styles.empty}>
          <h2>No workspaces yet</h2>
          <p>Create the first workspace for this storage provider.</p>
          <ButtonV2 type="button" onClick={() => setCreateOpen(true)}>
            New workspace
          </ButtonV2>
        </CardV2>
      ) : (
        <section aria-label="Available workspaces" className={styles.list}>
          {workspaces.map((workspace) => (
            <CardV2
              data-layout="flow"
              variant="outlined"
              key={workspace.id}
              className={styles.workspace}
              role="article"
              aria-label={workspace.name}
            >
              <div className={styles.workspaceCopy}>
                <span className={styles.status}>
                  {workspace.archived_at ? 'Archived' : 'Active'}
                </span>
                <h2>{workspace.name}</h2>
                <p>{workspace.description || 'No description.'}</p>
              </div>
              <div className={styles.actions}>
                <ButtonV2 type="button" onClick={() => openWorkspace(workspace)}>
                  Open workspace
                </ButtonV2>
                <Link to={`/workspaces/${workspace.id}/settings`}>Settings</Link>
                <ButtonV2
                  type="button"
                  variant="secondary"
                  onClick={() => setWorkspaceToDelete(workspace)}
                  disabled={saving}
                  aria-label={`Delete workspace ${workspace.name}`}
                >
                  Delete
                </ButtonV2>
              </div>
            </CardV2>
          ))}
        </section>
      )}

      <DialogV2
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setCreateOpen(false);
        }}
        title="Create workspace"
        description="Create a workspace in the currently selected storage provider."
        open={createOpen}
      >
        <form className={styles.form} onSubmit={(event) => void createWorkspace(event)}>
          <FormField label="Workspace name">
            <TextInputV2
              aria-label="Workspace name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={120}
            />
          </FormField>
          <FormField label="Workspace description">
            <Textarea
              aria-label="Workspace description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              maxLength={2000}
            />
          </FormField>
          <div className={styles.formActions}>
            <ButtonV2 type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </ButtonV2>
            <ButtonV2 type="submit" disabled={saving}>
              Create workspace
            </ButtonV2>
          </div>
        </form>
      </DialogV2>

      <DialogV2
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setWorkspaceToDelete(null);
        }}
        title={
          workspaceToDelete ? `Delete workspace ${workspaceToDelete.name}?` : 'Delete workspace?'
        }
        description="This permanently removes the workspace and its projects, Epics and work items from the selected provider. This cannot be undone."
        open={workspaceToDelete !== null}
      >
        <div className={styles.formActions}>
          <ButtonV2 type="button" variant="secondary" onClick={() => setWorkspaceToDelete(null)}>
            Cancel
          </ButtonV2>
          <ButtonV2 type="button" onClick={() => void deleteWorkspace()} disabled={saving}>
            Delete permanently
          </ButtonV2>
        </div>
      </DialogV2>
    </div>
  );
}
