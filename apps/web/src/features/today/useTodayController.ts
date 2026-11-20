import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { organizationApi, type Feature, type Project, type Workspace } from '@forge-org/api-client';
import { formatLocalDate, parseQuickCapture } from './quickCapture';
import { attentionCount, dueLabel, groupTodayItems, type TodayItem } from './todayModel';

const ACTIVE_WORKSPACE_KEY = 'forge-active-workspace';
const DEFAULT_WORKSPACE_NAME = 'Personal';
const INBOX_NAME = 'Inbox';

type Notice = { message: string; undo?: { item: TodayItem } };

function announce(name: string, detail: unknown) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

type LoadedToday = {
  target: { workspaceId: string; project: Project };
  projectCount: number;
  items: TodayItem[];
};

/** Resolves the workspace and Inbox (creating them on first use) and every open work item. */
async function loadToday(): Promise<LoadedToday> {
  const workspaces = await organizationApi.listWorkspaces();
  const saved = localStorage.getItem(ACTIVE_WORKSPACE_KEY) ?? '';
  const open = workspaces.filter((candidate) => !candidate.archived_at);
  let workspace: Workspace | undefined =
    open.find((candidate) => candidate.id === saved) ?? open[0];
  if (!workspace && workspaces.length === 0) {
    workspace = await organizationApi.createWorkspace(DEFAULT_WORKSPACE_NAME);
    announce('forge:workspace-created', { workspace });
  }
  if (!workspace) {
    throw new Error('Every workspace is archived. Restore one from Workspaces to continue.');
  }
  const workspaceId = workspace.id;
  localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
  announce('forge:active-workspace-change', { workspaceId });

  let projects = await organizationApi.listProjects(workspaceId);
  if (projects.length === 0) {
    const inbox = await organizationApi.createProject(workspaceId, INBOX_NAME);
    projects = [inbox];
    announce('forge:projects-changed', {});
  }
  const inbox =
    projects.find((project) => project.name.toLowerCase() === INBOX_NAME.toLowerCase()) ??
    projects[0];

  const overviews = await Promise.all(
    projects.map(async (project) => ({
      project,
      overview: await organizationApi.planningOverview(workspaceId, project.id),
    })),
  );
  const loaded = overviews.flatMap(({ project, overview }) =>
    [...overview.epics.flatMap((epic) => epic.features), ...overview.unassigned_features].map(
      (feature): TodayItem => ({
        feature,
        workspaceId,
        projectId: project.id,
        projectName: project.name,
      }),
    ),
  );
  return { target: { workspaceId, project: inbox }, projectCount: projects.length, items: loaded };
}

/**
 * Today is the default landing page: one line to capture a task, one list of what is due.
 * The workspace and the Inbox project it writes to are created on first use, so a new user never
 * has to set up structure before writing the first task.
 */
export function useTodayController() {
  const [items, setItems] = useState<TodayItem[]>([]);
  const [target, setTarget] = useState<{ workspaceId: string; project: Project } | null>(null);
  const [projectCount, setProjectCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const captureRef = useRef<HTMLInputElement>(null);

  const now = new Date();
  const todayIso = formatLocalDate(now);
  const preview = useMemo(() => parseQuickCapture(text, new Date()), [text]);
  const groups = useMemo(() => groupTodayItems(items, todayIso), [items, todayIso]);

  useEffect(() => {
    let current = true;
    void loadToday()
      .then((loaded) => {
        if (!current) return;
        setTarget(loaded.target);
        setProjectCount(loaded.projectCount);
        setItems(loaded.items);
        setLoading(false);
      })
      .catch((cause: unknown) => {
        if (!current) return;
        setError(cause instanceof Error ? cause.message : 'Unable to load Today.');
        setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [reloadToken]);

  // "n" jumps to the capture field from anywhere on the page, as in most task apps.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'n' || event.metaKey || event.ctrlKey || event.altKey) return;
      const element = event.target as HTMLElement | null;
      if (element && /^(INPUT|TEXTAREA|SELECT)$/.test(element.tagName)) return;
      if (element?.isContentEditable) return;
      event.preventDefault();
      captureRef.current?.focus();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const replaceFeature = useCallback((item: TodayItem, feature: Feature) => {
    setItems((existing) =>
      existing.map((candidate) =>
        candidate.feature.id === item.feature.id && candidate.projectId === item.projectId
          ? { ...candidate, feature }
          : candidate,
      ),
    );
  }, []);

  async function submitCapture(event: FormEvent) {
    event.preventDefault();
    if (!target || saving || !preview.title) return;
    setSaving(true);
    setError('');
    try {
      const feature = await createTask(target, preview.title, preview.dueDate);
      setItems((existing) => [
        ...existing,
        {
          feature,
          workspaceId: target.workspaceId,
          projectId: target.project.id,
          projectName: target.project.name,
        },
      ]);
      setText('');
      setNotice({
        message: preview.dueDate
          ? `Added “${preview.title}” · ${dueLabel(preview.dueDate, todayIso)}`
          : `Added “${preview.title}”`,
      });
      captureRef.current?.focus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to add the task.');
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(item: TodayItem, status: 'done' | 'backlog') {
    setError('');
    try {
      const feature = await updateFeature(item, { status });
      replaceFeature(item, feature);
      setNotice(
        status === 'done' ? { message: `Completed “${item.feature.title}”`, undo: { item } } : null,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update the task.');
    }
  }

  async function changeDueDate(item: TodayItem, dueDate: string | null) {
    setError('');
    try {
      replaceFeature(item, await updateFeature(item, { due_date: dueDate }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to change the date.');
    }
  }

  async function moveOverdueToToday() {
    setError('');
    const overdue = groups.overdue;
    try {
      const updated = await Promise.all(
        overdue.map((item) => updateFeature(item, { due_date: todayIso })),
      );
      overdue.forEach((item, index) => replaceFeature(item, updated[index]));
      setNotice({ message: `Moved ${overdue.length} overdue to today` });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to move the overdue tasks.');
    }
  }

  return {
    loading,
    error,
    text,
    setText,
    saving,
    preview,
    groups,
    todayIso,
    attention: attentionCount(groups),
    openCount: items.filter((item) => item.feature.status !== 'done').length,
    showProject: projectCount > 1,
    inboxName: target?.project.name ?? INBOX_NAME,
    notice,
    dismissNotice: () => setNotice(null),
    undoCompletion: (item: TodayItem) => void setStatus(item, 'backlog'),
    captureRef,
    submitCapture,
    complete: (item: TodayItem) => void setStatus(item, 'done'),
    changeDueDate: (item: TodayItem, dueDate: string | null) => void changeDueDate(item, dueDate),
    moveOverdueToToday: () => void moveOverdueToToday(),
    retry: () => {
      setLoading(true);
      setError('');
      setReloadToken((value) => value + 1);
    },
  };
}

function createTask(
  target: { workspaceId: string; project: Project },
  title: string,
  dueDate: string | null,
) {
  return organizationApi.createFeature(
    target.workspaceId,
    target.project.id,
    title,
    undefined,
    dueDate ? { due_date: dueDate } : undefined,
  );
}

function updateFeature(
  item: TodayItem,
  values: Parameters<typeof organizationApi.updateFeature>[3],
) {
  return organizationApi.updateFeature(item.workspaceId, item.projectId, item.feature.id, values);
}
