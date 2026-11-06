import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStorageSnapshot, organizationApi, type Workspace } from '@forge-org/api-client';

export function useWorkspaceManagementController() {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const listRevision = useRef(0);
  const provider = getStorageSnapshot().provider;

  useEffect(() => {
    let current = true;
    const requestRevision = ++listRevision.current;
    void organizationApi
      .listWorkspaces()
      .then((items) => {
        if (current && requestRevision === listRevision.current) setWorkspaces(items);
      })
      .catch((cause: unknown) => {
        if (current && requestRevision === listRevision.current)
          setError(cause instanceof Error ? cause.message : 'Unable to load workspaces.');
      })
      .finally(() => {
        if (current && requestRevision === listRevision.current) setLoading(false);
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
      listRevision.current += 1;
      setWorkspaces((items) => [...items.filter((item) => item.id !== workspace.id), workspace]);
      window.dispatchEvent(new CustomEvent('forge:workspace-created', { detail: { workspace } }));
      setName('');
      setDescription('');
      setCreateOpen(false);
      setLoading(false);
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
      listRevision.current += 1;
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
  return {
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
  };
}
