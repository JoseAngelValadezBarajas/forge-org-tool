import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { organizationApi, type Epic, type Feature, type Project } from '@forge-org/api-client';
import { formatLocalDate, parseQuickCapture } from './quickCapture';
import { planOrganize, tagsProblem, type OrganizeValues } from './organize';
import { INBOX_NAME, loadTodayData } from './todayData';
import { attentionCount, dueLabel, groupTodayItems, type TodayItem } from './todayModel';

type Notice = { message: string; undo?: { item: TodayItem } };

/**
 * Today is the default landing page: one line to capture a task, one list of what is due.
 * The workspace and the Inbox project it writes to are created on first use, so a new user never
 * has to set up structure before writing the first task.
 */
export function useTodayController() {
  const [items, setItems] = useState<TodayItem[]>([]);
  const [target, setTarget] = useState<{ workspaceId: string; project: Project } | null>(null);
  const [projectCount, setProjectCount] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [epicsByProject, setEpicsByProject] = useState<Record<string, Epic[]>>({});
  const [organizing, setOrganizing] = useState<TodayItem | null>(null);
  const [organizeError, setOrganizeError] = useState('');
  const [organizeSaving, setOrganizeSaving] = useState(false);
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
    void loadTodayData({ bootstrap: true })
      .then((loaded) => {
        if (!current) return;
        setTarget(loaded.target);
        setProjectCount(loaded.projectCount);
        setProjects(loaded.projects);
        setEpicsByProject(loaded.epicsByProject);
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

  const replaceItem = useCallback((previous: TodayItem, next: TodayItem) => {
    setItems((existing) =>
      existing.map((candidate) =>
        candidate.feature.id === previous.feature.id && candidate.projectId === previous.projectId
          ? next
          : candidate,
      ),
    );
  }, []);

  /** Applies the Organize dialog: an optional move first, then the remaining field changes. */
  async function saveOrganize(item: TodayItem, values: OrganizeValues) {
    const problem = tagsProblem(values.tags);
    if (problem) {
      setOrganizeError(problem);
      return;
    }
    const plan = planOrganize(item, values);
    if (!plan.move && !plan.update) {
      setOrganizing(null);
      return;
    }
    setOrganizeSaving(true);
    setOrganizeError('');
    let current = item;
    try {
      if (plan.move) {
        const moved = await organizationApi.moveFeature(
          item.workspaceId,
          item.projectId,
          item.feature.id,
          plan.move.projectId,
          plan.move.epicId,
        );
        const destination = projects.find((project) => project.id === plan.move?.projectId);
        const next = {
          ...item,
          feature: moved,
          projectId: plan.move.projectId,
          projectName: destination?.name ?? item.projectName,
        };
        replaceItem(item, next);
        current = next;
      }
      if (plan.update) {
        const updated = await updateFeature(current, plan.update);
        const next = { ...current, feature: updated };
        replaceItem(current, next);
        current = next;
      }
      setOrganizing(null);
      setNotice({ message: `Organized “${item.feature.title}”` });
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : 'Unable to organize the task.';
      // A move that already happened is real: say so instead of implying nothing changed.
      setOrganizeError(
        current === item ? reason : `Moved, but the other changes failed: ${reason}`,
      );
      if (current !== item) setOrganizing(current);
    } finally {
      setOrganizeSaving(false);
    }
  }

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
    projects,
    epicsByProject,
    organizing,
    organizeError,
    organizeSaving,
    openOrganize: (item: TodayItem) => {
      setOrganizeError('');
      setOrganizing(item);
    },
    closeOrganize: () => setOrganizing(null),
    saveOrganize: (item: TodayItem, values: OrganizeValues) => void saveOrganize(item, values),
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
