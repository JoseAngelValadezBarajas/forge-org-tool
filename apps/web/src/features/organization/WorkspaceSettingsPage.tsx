import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { organizationApi, type Workspace } from '@forge-org/api-client';
import { Button, Card, FormField, Input, SectionHeader, StatusChip, Textarea } from '@forge-org/ui';
import { WorkspaceTagsPanel } from './WorkspaceTagsPanel';
import styles from './WorkspaceSettingsPage.module.css';

export function WorkspaceSettingsPage() {
  const { workspaceId = '' } = useParams();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let current = true;
    void organizationApi
      .listWorkspaces()
      .then((items) => {
        const selected = items.find((item) => item.id === workspaceId) ?? null;
        if (!current) return;
        setWorkspace(selected);
        setName(selected?.name ?? '');
        setDescription(selected?.description ?? '');
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

  async function save(event: FormEvent) {
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
      window.dispatchEvent(
        new CustomEvent('forge:workspace-updated', { detail: { workspace: updated } }),
      );
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update Workspace status.');
    }
  }

  if (loading) return <p role="status">Loading Workspace settings…</p>;
  if (!workspace)
    return (
      <Card>
        <p role="alert">{error || 'Workspace not found.'}</p>
        <Link to="/">Back to Projects</Link>
      </Card>
    );

  return (
    <div className={styles.stack}>
      <SectionHeader
        title="Workspace settings"
        eyebrow={workspace.name}
        actions={<Link to="/">Back to Projects</Link>}
      />
      {error && <p role="alert">{error}</p>}
      {!workspace.archived_at ? (
        <WorkspaceTagsPanel workspaceId={workspace.id} />
      ) : (
        <Card>
          <h2>Manage workspace tags</h2>
          <p>Restore this Workspace to manage its shared tags.</p>
        </Card>
      )}
      <Card>
        <section aria-labelledby="workspace-profile-heading">
          <h2 id="workspace-profile-heading">Workspace profile</h2>
          {workspace.archived_at && <StatusChip tone="warning">Archived</StatusChip>}
          <form onSubmit={(event) => void save(event)} className={styles.form}>
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
            <div className={styles.actions}>
              <Button type="submit">Save Workspace</Button>
              <Button type="button" variant="secondary" onClick={() => void toggleArchive()}>
                {workspace.archived_at ? 'Restore Workspace' : 'Archive Workspace'}
              </Button>
            </div>
          </form>
        </section>
      </Card>
    </div>
  );
}
