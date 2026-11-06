import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import {
  organizationApi,
  type Epic,
  type EpicStatus,
  type Feature,
  type PlanningOverview,
  type Project,
  type WorkspaceTag,
} from '@forge-org/api-client';
import { PLANNING_COLUMN_STATUSES } from './components/KanbanColumn/KanbanColumn';
import { usePointerKanbanDrag } from './usePointerKanbanDrag';

export const statuses: EpicStatus[] = ['backlog', 'ready', 'in_progress', 'verify', 'done'];

export function useEpicDetailController() {
  const { workspaceId = '', projectId = '', epicId = '' } = useParams();
  const currentEpicId = useRef(epicId);
  const [project, setProject] = useState<Project | null>(null);
  const [epic, setEpic] = useState<Epic | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<string>('backlog');
  const [features, setFeatures] = useState<Feature[]>([]);
  const [featureSearch, setFeatureSearch] = useState('');
  const [featureKind, setFeatureKind] = useState('all');
  const [featurePriority, setFeaturePriority] = useState('all');
  const [featureTag, setFeatureTag] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemKind, setNewItemKind] = useState<'story' | 'bug'>('story');
  const [newItemTags, setNewItemTags] = useState<string[]>([]);
  const [newBugSeverity, setNewBugSeverity] = useState('medium');
  const [newBugSteps, setNewBugSteps] = useState('');
  const [newBugExpected, setNewBugExpected] = useState('');
  const [newBugActual, setNewBugActual] = useState('');
  const [workspaceTags, setWorkspaceTags] = useState<WorkspaceTag[]>([]);
  const [mobileStatus, setMobileStatus] = useState('ready');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 720);
  const [mobileCardDetails, setMobileCardDetails] = useState<Record<string, string>>({});

  useEffect(() => {
    currentEpicId.current = epicId;
  }, [epicId]);

  const load = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      setLoading(true);
      setError('');
      try {
        const [nextProject, overview]: [Project, PlanningOverview] = await Promise.all([
          organizationApi.getProject(workspaceId, projectId),
          organizationApi.planningOverview(workspaceId, projectId),
        ]);
        if (!isCurrent()) return;
        const match = overview.epics.find(
          (item) => item.id === epicId && item.project_id === projectId,
        );
        if (!match) throw new Error('Epic not found in this project.');
        setProject(nextProject);
        setEpic(match);
        setTitle(match.title);
        setDescription(match.description ?? '');
        setStatus(match.status);
        setFeatures(match.features);
      } catch (cause) {
        if (isCurrent())
          setError(cause instanceof Error ? cause.message : 'Unable to load Epic detail.');
      } finally {
        if (isCurrent()) setLoading(false);
      }
    },
    [epicId, projectId, workspaceId],
  );

  useEffect(() => {
    let current = true;
    queueMicrotask(() => void load(() => current));
    return () => {
      current = false;
    };
  }, [load]);

  useEffect(() => {
    let current = true;
    void organizationApi.listWorkspaceTags(workspaceId).then(
      (tags) => current && setWorkspaceTags(tags),
      () => current && setError('Workspace tags could not be loaded.'),
    );
    return () => {
      current = false;
    };
  }, [workspaceId]);

  useEffect(() => {
    function updateViewport() {
      setIsMobile(window.innerWidth <= 720);
    }
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    if (!isMobile || features.length === 0) return;
    let current = true;
    void Promise.all(
      features.map(async (feature) => {
        try {
          if (feature.kind === 'bug') {
            const attachments = await organizationApi.listBugAttachments(
              workspaceId,
              projectId,
              feature.id,
            );
            return [
              feature.id,
              attachments.length ? 'Screenshot attached' : 'No screenshot',
            ] as const;
          }
          const criteria = await organizationApi.listCriteria(workspaceId, projectId, feature.id);
          return [feature.id, `${criteria.length} acceptance criteria`] as const;
        } catch {
          return [feature.id, ''] as const;
        }
      }),
    ).then((entries) => {
      if (current) setMobileCardDetails(Object.fromEntries(entries));
    });
    return () => {
      current = false;
    };
  }, [features, isMobile, projectId, workspaceId]);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!epic || epic.id !== epicId || project?.status !== 'active' || !title.trim()) return;
    setSaved(false);
    setError('');
    try {
      const updated = await organizationApi.updateEpic(workspaceId, projectId, epic.id, {
        title: title.trim(),
        description: description.trim() || null,
        ...(statuses.includes(status as EpicStatus) ? { status: status as EpicStatus } : {}),
      });
      if (currentEpicId.current !== epic.id) return;
      setEpic(updated);
      setTitle(updated.title);
      setDescription(updated.description ?? '');
      setStatus(updated.status);
      setSaved(true);
      setEditing(false);
    } catch (cause) {
      if (currentEpicId.current !== epic.id) return;
      setError(cause instanceof Error ? cause.message : 'Unable to save Epic.');
    }
  }

  async function moveFeature(
    feature: Feature,
    values: { status?: Feature['status']; priority?: Feature['priority'] },
  ) {
    try {
      const updated = await organizationApi.updateFeature(
        workspaceId,
        projectId,
        feature.id,
        values,
      );
      setFeatures((items) => items.map((item) => (item.id === updated.id ? updated : item)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update Work Item.');
    }
  }

  async function createWorkItem(event: FormEvent) {
    event.preventDefault();
    if (!newItemTitle.trim() || readOnly) return;
    const details =
      newItemKind === 'bug'
        ? {
            kind: 'bug' as const,
            bug_severity: newBugSeverity,
            steps_to_reproduce: newBugSteps,
            expected_result: newBugExpected,
            actual_result: newBugActual,
            tags: newItemTags,
          }
        : { kind: 'story' as const, tags: newItemTags };
    try {
      const created = await organizationApi.createFeature(
        workspaceId,
        projectId,
        newItemTitle.trim(),
        epicId,
        details,
      );
      setFeatures((items) => [...items, created]);
      setNewItemTitle('');
      setNewItemTags([]);
      setNewBugSteps('');
      setNewBugExpected('');
      setNewBugActual('');
      setError('');
      setCreateItemOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create Work Item.');
    }
  }

  const filteredFeatures = features.filter((feature) => {
    const query = featureSearch.trim().toLocaleLowerCase();
    const tag = featureTag.trim().toLocaleLowerCase();
    return (
      (!query || feature.title.toLocaleLowerCase().includes(query)) &&
      (featureKind === 'all' || feature.kind === featureKind) &&
      (featurePriority === 'all' || feature.priority === featurePriority) &&
      (!tag || feature.tags?.some((value: string) => value.toLocaleLowerCase().includes(tag)))
    );
  });

  const readOnly = project?.status !== 'active' || Boolean(epic?.archived_at);
  const completedCount = features.filter((feature) => feature.status === 'done').length;
  const legacyFeatures = filteredFeatures.filter(
    (feature) => !PLANNING_COLUMN_STATUSES.some((column) => column.value === feature.status),
  );
  const featurePointerDrag = usePointerKanbanDrag<Feature['status']>({
    onDrop: (id, destination) => {
      if (readOnly || !PLANNING_COLUMN_STATUSES.some((column) => column.value === destination)) {
        return;
      }
      const feature = features.find((item) => item.id === id);
      if (feature && feature.status !== destination)
        void moveFeature(feature, { status: destination });
    },
  });
  return {
    workspaceId,
    projectId,
    epicId,
    project,
    epic,
    title,
    setTitle,
    description,
    setDescription,
    status,
    setStatus,
    features,
    featureSearch,
    setFeatureSearch,
    featureKind,
    setFeatureKind,
    featurePriority,
    setFeaturePriority,
    featureTag,
    setFeatureTag,
    error,
    saved,
    loading,
    editing,
    setEditing,
    createItemOpen,
    setCreateItemOpen,
    newItemTitle,
    setNewItemTitle,
    newItemKind,
    setNewItemKind,
    newItemTags,
    setNewItemTags,
    newBugSeverity,
    setNewBugSeverity,
    newBugSteps,
    setNewBugSteps,
    newBugExpected,
    setNewBugExpected,
    newBugActual,
    setNewBugActual,
    workspaceTags,
    mobileStatus,
    setMobileStatus,
    isMobile,
    mobileCardDetails,
    load,
    save,
    moveFeature,
    createWorkItem,
    filteredFeatures,
    readOnly,
    completedCount,
    legacyFeatures,
    featurePointerDrag,
  };
}
