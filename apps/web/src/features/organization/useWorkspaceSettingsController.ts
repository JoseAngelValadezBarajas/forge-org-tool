import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { organizationApi, type Workspace, type WorkspaceTag } from '@forge-org/api-client';

type TagDraft = Pick<WorkspaceTag, 'name' | 'color'>;

export function useWorkspaceSettingsController() {
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
          Object.fromEntries(Object.entries(current).filter(([name]) => name !== deletedName)),
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
  return {
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
  };
}
