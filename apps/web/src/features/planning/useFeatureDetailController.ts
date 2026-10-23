import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  organizationApi,
  type Criterion,
  type Dependency,
  type Feature,
  type ReadinessResult,
  type Task,
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
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null);
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
        const [nextTasks, nextCriteria, nextDependencies, nextReadiness, nextOverview] =
          await Promise.all([
            organizationApi.listTasks(workspaceId, projectId, featureId),
            organizationApi.listCriteria(workspaceId, projectId, featureId),
            organizationApi.listDependencies(workspaceId, projectId),
            organizationApi.previewReadiness(workspaceId, projectId, featureId).catch(() => null),
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
        setFeature(nextFeature);
        setFeatureTitle(nextFeature?.title ?? '');
        setFeatureDescription(nextFeature?.description ?? '');
        setFeatureGoal(nextFeature?.goal ?? '');
        setReadiness(nextReadiness);
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

  async function saveFeature(event: FormEvent) {
    event.preventDefault();
    if (!feature || !featureTitle.trim()) return;
    try {
      const updated = await organizationApi.updateFeature(workspaceId, projectId, feature.id, {
        title: featureTitle.trim(),
        description: featureDescription.trim() || null,
        goal: featureGoal.trim() || null,
      });
      setFeature(updated);
      setFeatureTitle(updated.title);
      setFeatureDescription(updated.description ?? '');
      setFeatureGoal(updated.goal ?? '');
      setFeatures((items) => items.map((item) => (item.id === updated.id ? updated : item)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update feature.');
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
    addTask,
    changeTask,
    criteria,
    criterion,
    dependencies,
    error,
    featureName,
    moveTask,
    readiness,
    feature,
    featureDescription,
    featureGoal,
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
