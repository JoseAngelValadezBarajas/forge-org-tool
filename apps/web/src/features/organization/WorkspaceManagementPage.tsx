import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getStorageSnapshot, organizationApi, type Workspace } from '@forge-org/api-client';
import { Button, Card, Dialog, FormField, Input, Textarea } from '@corefoundry-labs/forge-ui';
import styles from './WorkspaceManagementPage.module.css';

export function WorkspaceManagementPage() {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const provider = getStorageSnapshot().provider;

  useEffect(() => {
    let current = true;
    void organizationApi
      .listWorkspaces()
      .then((items) => {
        if (current) setWorkspaces(items);
      })
      .catch((cause: unknown) => {
        if (current)
          setError(cause instanceof Error ? cause.message : 'Unable to load workspaces.');
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, []);

  async function createWorkspace(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const workspace = await organizationApi.createWorkspace(
        name.trim(),
        description.trim() || undefined,
      );
      setWorkspaces((items) => [...items.filter((item) => item.id !== workspace.id), workspace]);
      window.dispatchEvent(new CustomEvent('forge:workspace-created', { detail: { workspace } }));
      setName('');
      setDescription('');
      setCreateOpen(false);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create workspace.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteWorkspace() {
    if (!workspaceToDelete) return;
    setSaving(true);
    try {
      const id = workspaceToDelete.id;
      await organizationApi.deleteWorkspace(id);
      setWorkspaces((items) => items.filter((item) => item.id !== id));
      if (localStorage.getItem('forge-active-workspace') === id) {
        localStorage.removeItem('forge-active-workspace');
      }
      window.dispatchEvent(
        new CustomEvent('forge:workspace-deleted', { detail: { workspaceId: id } }),
      );
      setWorkspaceToDelete(null);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to delete workspace.');
    } finally {
      setSaving(false);
    }
  }

  function openWorkspace(workspace: Workspace) {
    localStorage.setItem('forge-active-workspace', workspace.id);
    window.dispatchEvent(
      new CustomEvent('forge:active-workspace-change', { detail: { workspaceId: workspace.id } }),
    );
    navigate('/');
  }

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
