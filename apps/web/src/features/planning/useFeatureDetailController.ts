import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { organizationApi, type Criterion, type Dependency, type Task } from '@forge-org/api-client';

export function useFeatureDetailController(
  workspaceId: string,
  projectId: string,
  featureId: string,
) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [taskTitle, setTaskTitle] = useState('');
  const [criterion, setCriterion] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      try {
        const [nextTasks, nextCriteria, nextDependencies] = await Promise.all([
          organizationApi.listTasks(workspaceId, projectId, featureId),
          organizationApi.listCriteria(workspaceId, projectId, featureId),
          organizationApi.listDependencies(workspaceId, projectId),
        ]);
        if (!isCurrent()) return;
        setTasks(nextTasks);
        setCriteria(nextCriteria);
        setDependencies(nextDependencies);
      } catch (cause) {
        if (isCurrent()) {
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
    try {
      setTasks(await organizationApi.reorderTasks(workspaceId, projectId, featureId, ids));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to reorder tasks.');
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
    moveTask,
    setCriterion,
    setTaskTitle,
    taskTitle,
    tasks,
  };
}
