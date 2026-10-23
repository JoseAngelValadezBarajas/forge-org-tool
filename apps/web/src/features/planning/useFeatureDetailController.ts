import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  organizationApi,
  type BugAttachment,
  type Criterion,
  type Dependency,
  type Feature,
  type Task,
  type WorkspaceTag,
} from '@forge-org/api-client';

export function useFeatureDetailController(
  workspaceId: string,
  projectId: string,
  featureId: string,
) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [feature, setFeature] = useState<Feature | null>(null);
  const [featureTitle, setFeatureTitle] = useState('');
  const [featureDescription, setFeatureDescription] = useState('');
  const [featureGoal, setFeatureGoal] = useState('');
  const [bugSeverity, setBugSeverity] = useState('medium');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [actualResult, setActualResult] = useState('');
  const [featureTags, setFeatureTags] = useState('');
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<BugAttachment[]>([]);
  const [workspaceTags, setWorkspaceTags] = useState<WorkspaceTag[]>([]);
  const [taskTitle, setTaskTitle] = useState('');
  const [criterion, setCriterion] = useState('');
  const [error, setError] = useState('');
  const loadGeneration = useRef(0);
  const taskGeneration = useRef(0);

  const load = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      const generation = ++loadGeneration.current;
      const tasksAtStart = taskGeneration.current;
      try {
        const [nextTasks, nextCriteria, nextDependencies, nextOverview] = await Promise.all([
          organizationApi.listTasks(workspaceId, projectId, featureId),
          organizationApi.listCriteria(workspaceId, projectId, featureId),
          organizationApi.listDependencies(workspaceId, projectId),
          organizationApi
            .planningOverview(workspaceId, projectId)
            .catch(() => ({ epics: [], unassigned_features: [] })),
        ]);
        if (!isCurrent() || generation !== loadGeneration.current) return;
        if (tasksAtStart === taskGeneration.current) setTasks(nextTasks);
        setCriteria(nextCriteria);
        setDependencies(nextDependencies);
        const nextFeatures = (nextOverview.epics ?? [])
          .flatMap((epic) => epic.features)
          .concat(nextOverview.unassigned_features ?? []);
        setFeatures(nextFeatures);
        const nextFeature = nextFeatures.find((item) => item.id === featureId) ?? null;
        const nextAttachments =
          nextFeature?.kind === 'bug'
            ? await organizationApi.listBugAttachments(workspaceId, projectId, featureId)
            : [];
        if (!isCurrent() || generation !== loadGeneration.current) return;
        setFeature(nextFeature);
        setFeatureTitle(nextFeature?.title ?? '');
        setFeatureDescription(nextFeature?.description ?? '');
        setFeatureGoal(nextFeature?.goal ?? '');
        setNotes(nextFeature?.notes ?? '');
        setBugSeverity(nextFeature?.bug_severity ?? 'medium');
        setStepsToReproduce(nextFeature?.steps_to_reproduce ?? '');
        setExpectedResult(nextFeature?.expected_result ?? '');
        setActualResult(nextFeature?.actual_result ?? '');
        setFeatureTags(nextFeature?.tags?.join(', ') ?? '');
        setAttachments(nextAttachments);
        const nextTags = await organizationApi.listWorkspaceTags(workspaceId).catch(() => []);
        if (!isCurrent() || generation !== loadGeneration.current) return;
        setWorkspaceTags(Array.isArray(nextTags) ? nextTags : []);
      } catch (cause) {
        if (isCurrent() && generation === loadGeneration.current) {
          setError(cause instanceof Error ? cause.message : 'Unable to load feature detail.');
        }
      }
    },
    [featureId, projectId, workspaceId],
  );

  useEffect(() => {
    let current = true;
    queueMicrotask(() => void load(() => current));
    return () => {
      current = false;
    };
  }, [load]);

  async function addTask(event: FormEvent) {
    event.preventDefault();
    if (!taskTitle.trim()) return;
    try {
      await organizationApi.createTask(workspaceId, projectId, featureId, taskTitle);
      setTaskTitle('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to add task.');
    }
  }

  function featureName(id: string) {
    return features.find((feature) => feature.id === id)?.title ?? id;
  }

  async function saveFeature(event: FormEvent): Promise<boolean> {
    event.preventDefault();
    if (!feature || !featureTitle.trim()) return false;
    try {
      const updated = await organizationApi.updateFeature(workspaceId, projectId, feature.id, {
        title: featureTitle.trim(),
        description: featureDescription.trim() || null,
        goal: featureGoal.trim() || null,
        ...(feature.kind === 'bug'
          ? {
              bug_severity: bugSeverity,
              steps_to_reproduce: stepsToReproduce.trim() || null,
              expected_result: expectedResult.trim() || null,
              actual_result: actualResult.trim() || null,
            }
          : {}),
        tags: featureTags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        notes: notes.trim() || null,
      });
      setFeature(updated);
      setFeatureTitle(updated.title);
      setFeatureDescription(updated.description ?? '');
      setFeatureGoal(updated.goal ?? '');
      setNotes(updated.notes ?? '');
      setFeatures((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update feature.');
      return false;
    }
  }

  async function addCriterion(event: FormEvent) {
    event.preventDefault();
    if (!criterion.trim()) return;
    try {
      await organizationApi.createCriterion(workspaceId, projectId, featureId, criterion);
      setCriterion('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to add criterion.');
    }
  }

  async function updateCriterion(
    criterionId: string,
    values: Parameters<typeof organizationApi.updateCriterion>[4],
  ) {
    try {
      await organizationApi.updateCriterion(workspaceId, projectId, featureId, criterionId, values);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update acceptance criterion.');
    }
  }

  async function removeCriterion(criterionId: string) {
    try {
      await organizationApi.deleteCriterion(workspaceId, projectId, featureId, criterionId);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to delete acceptance criterion.');
    }
  }

  async function moveCriterion(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= criteria.length) return;
    const ids = criteria.map((item) => item.id);
    [ids[index], ids[nextIndex]] = [ids[nextIndex], ids[index]];
    try {
      await organizationApi.reorderCriteria(workspaceId, projectId, featureId, ids);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to reorder acceptance criteria.');
    }
  }

  async function uploadAttachment(file: File) {
    if (!feature || feature.kind !== 'bug') return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Screenshot must be 5 MiB or smaller.');
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Choose a PNG, JPEG, or WebP screenshot.');
      return;
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
      }
      await organizationApi.uploadBugAttachment(workspaceId, projectId, feature.id, {
        file_name: file.name,
        content_type: file.type as 'image/png' | 'image/jpeg' | 'image/webp',
        data_base64: btoa(binary),
      });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to upload screenshot.');
    }
  }

  async function removeAttachment(attachmentId: string) {
    try {
      await organizationApi.deleteBugAttachment(workspaceId, projectId, featureId, attachmentId);
      setAttachments((items) => items.filter((item) => item.id !== attachmentId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to remove screenshot.');
    }
  }

  async function changeTask(task: Task, status: Task['status']) {
    try {
      await organizationApi.updateTask(workspaceId, projectId, featureId, task.id, { status });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update task.');
    }
  }

  async function moveTask(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= tasks.length) return;
    const ids = tasks.map((task) => task.id);
    [ids[index], ids[nextIndex]] = [ids[nextIndex], ids[index]];
    const generation = ++taskGeneration.current;
    try {
      const reordered = await organizationApi.reorderTasks(workspaceId, projectId, featureId, ids);
      if (generation === taskGeneration.current) setTasks(reordered);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to reorder tasks.');
      await load();
    }
  }

  return {
    addCriterion,
    updateCriterion,
    removeCriterion,
    moveCriterion,
    addTask,
    changeTask,
    criteria,
    criterion,
    dependencies,
    error,
    featureName,
    moveTask,
    feature,
    attachments,
    workspaceTags,
    reload: load,
    uploadAttachment,
    removeAttachment,
    featureDescription,
    featureGoal,
    bugSeverity,
    setBugSeverity,
    stepsToReproduce,
    setStepsToReproduce,
    expectedResult,
    setExpectedResult,
    actualResult,
    setActualResult,
    featureTags,
    setFeatureTags,
    notes,
    setNotes,
    featureTitle,
    saveFeature,
    setFeatureTitle,
    setFeatureDescription,
    setFeatureGoal,
    setCriterion,
    setTaskTitle,
    taskTitle,
    tasks,
  };
}
