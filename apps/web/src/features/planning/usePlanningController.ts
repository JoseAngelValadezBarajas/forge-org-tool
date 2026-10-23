import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  organizationApi,
  type Dependency,
  type Feature,
  type PlanningOverview,
} from '@forge-org/api-client';

export function usePlanningController(workspaceId: string, projectId: string) {
  const [overview, setOverview] = useState<PlanningOverview>({
    epics: [],
    unassigned_features: [],
  });
  const [title, setTitle] = useState('');
  const [featureTitle, setFeatureTitle] = useState('');
  const [featureEpicId, setFeatureEpicId] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [epicFilter, setEpicFilter] = useState('all');
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [blockingFeatureId, setBlockingFeatureId] = useState('');
  const [blockedFeatureId, setBlockedFeatureId] = useState('');
  const [error, setError] = useState('');

  const features = overview.epics
    .flatMap((epic) => epic.features)
    .concat(overview.unassigned_features);
  const visibleFeatures = features.filter((feature) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [feature.title, feature.description ?? '', feature.goal ?? ''].some((value) =>
        value.toLowerCase().includes(query),
      );
    return (
      matchesSearch &&
      (statusFilter === 'all' || feature.status === statusFilter) &&
      (priorityFilter === 'all' || feature.priority === priorityFilter) &&
      (epicFilter === 'all' ||
        feature.epic_id === epicFilter ||
        (epicFilter === 'unassigned' && feature.epic_id === null))
    );
  });

  const load = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      try {
        const [nextOverview, nextDependencies] = await Promise.all([
          organizationApi.planningOverview(workspaceId, projectId),
          organizationApi.listDependencies(workspaceId, projectId),
        ]);
        if (!isCurrent()) return;
        setOverview(nextOverview);
        setDependencies(nextDependencies);
      } catch (cause) {
        if (isCurrent()) {
          setError(cause instanceof Error ? cause.message : 'Unable to load planning.');
        }
      }
    },
    [projectId, workspaceId],
  );

  useEffect(() => {
    let current = true;
    queueMicrotask(() => void load(() => current));
    return () => {
      current = false;
    };
  }, [load]);

  async function createEpic(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    try {
      await organizationApi.createEpic(workspaceId, projectId, title);
      setTitle('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create epic.');
    }
  }

  async function createFeature(event: FormEvent) {
    event.preventDefault();
    if (!featureTitle.trim()) return;
    try {
      await organizationApi.createFeature(
        workspaceId,
        projectId,
        featureTitle,
        featureEpicId || undefined,
      );
      setFeatureTitle('');
      setFeatureEpicId('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create feature.');
    }
  }

  async function updateFeature(
    feature: Feature,
    values: Parameters<typeof organizationApi.updateFeature>[3],
  ) {
    try {
      await organizationApi.updateFeature(workspaceId, projectId, feature.id, values);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update feature.');
    }
  }

  async function addDependency(event: FormEvent) {
    event.preventDefault();
    if (!blockingFeatureId || !blockedFeatureId || blockingFeatureId === blockedFeatureId) return;
    try {
      await organizationApi.createDependency(
        workspaceId,
        projectId,
        blockingFeatureId,
        blockedFeatureId,
      );
      setBlockingFeatureId('');
      setBlockedFeatureId('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to add dependency.');
    }
  }

  async function removeDependency(dependency: Dependency) {
    try {
      await organizationApi.deleteDependency(workspaceId, projectId, dependency.id);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to remove dependency.');
    }
  }

  function featureName(id: string) {
    return features.find((feature) => feature.id === id)?.title ?? id;
  }

  return {
    addDependency,
    blockedFeatureId,
    blockingFeatureId,
    createEpic,
    createFeature,
    dependencies,
    epicFilter,
    error,
    featureName,
    featureTitle,
    featureEpicId,
    features,
    load,
    overview,
    priorityFilter,
    removeDependency,
    search,
    setBlockedFeatureId,
    setBlockingFeatureId,
    setEpicFilter,
    setFeatureTitle,
    setFeatureEpicId,
    setPriorityFilter,
    setSearch,
    setStatusFilter,
    setTitle,
    statusFilter,
    title,
    updateFeature,
    visibleFeatures,
  };
}
