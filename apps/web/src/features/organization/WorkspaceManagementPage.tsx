import { Link } from 'react-router-dom';
import { Button, Card, Dialog, FormField, Input, Textarea } from '@corefoundry-labs/forge-ui';
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
        <Button type="button" onClick={() => setCreateOpen(true)}>
          New workspace
        </Button>
      </header>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Loading workspaces…</p>
      ) : workspaces.length === 0 ? (
        <Card className={styles.empty}>
          <h2>No workspaces yet</h2>
          <p>Create the first workspace for this storage provider.</p>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            New workspace
          </Button>
        </Card>
      ) : (
        <section aria-label="Available workspaces" className={styles.list}>
          {workspaces.map((workspace) => (
            <Card
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
                <Button type="button" onClick={() => openWorkspace(workspace)}>
                  Open workspace
                </Button>
                <Link to={`/workspaces/${workspace.id}/settings`}>Settings</Link>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setWorkspaceToDelete(workspace)}
                  disabled={saving}
                  aria-label={`Delete workspace ${workspace.name}`}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </section>
      )}

      <Dialog
        title="Create workspace"
        description="Create a workspace in the currently selected storage provider."
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCancel={() => setCreateOpen(false)}
      >
        <form className={styles.form} onSubmit={(event) => void createWorkspace(event)}>
          <FormField label="Workspace name">
            <Input
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
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              Create workspace
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        title={
          workspaceToDelete ? `Delete workspace ${workspaceToDelete.name}?` : 'Delete workspace?'
        }
        description="This permanently removes the workspace and its projects, Epics and work items from the selected provider. This cannot be undone."
        open={workspaceToDelete !== null}
        onClose={() => setWorkspaceToDelete(null)}
        onCancel={() => setWorkspaceToDelete(null)}
      >
        <div className={styles.formActions}>
          <Button type="button" variant="secondary" onClick={() => setWorkspaceToDelete(null)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void deleteWorkspace()} disabled={saving}>
            Delete permanently
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
