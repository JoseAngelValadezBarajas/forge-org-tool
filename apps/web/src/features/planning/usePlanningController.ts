import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  organizationApi,
  type Dependency,
  type Epic,
  type EpicStatus,
  type Feature,
  type PlanningOverview,
} from '@forge-org/api-client';

export function usePlanningController(workspaceId: string, projectId: string) {
  const latestLoad = useRef(0);
  const [overview, setOverview] = useState<PlanningOverview>({
    epics: [],
    unassigned_features: [],
  });
  const [title, setTitle] = useState('');
  const [epicPriority, setEpicPriority] = useState<'low' | 'medium' | 'high' | 'critical'>(
    'medium',
  );
  const [epicTags, setEpicTags] = useState('');
  const [featureTitle, setFeatureTitle] = useState('');
  const [featureEpicId, setFeatureEpicId] = useState('');
  const [featureKind, setFeatureKind] = useState<'story' | 'bug'>('story');
  const [bugSeverity, setBugSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [actualResult, setActualResult] = useState('');
  const [featureTags, setFeatureTags] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [epicFilter, setEpicFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('');
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
      (!tagFilter.trim() ||
        feature.tags?.some((tag: string) =>
          tag.toLowerCase().includes(tagFilter.trim().toLowerCase()),
        )) &&
      (epicFilter === 'all' ||
        feature.epic_id === epicFilter ||
        (epicFilter === 'unassigned' && feature.epic_id === null))
    );
  });

  const load = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      const requestId = ++latestLoad.current;
      try {
        const [nextOverview, nextDependencies] = await Promise.all([
          organizationApi.planningOverview(workspaceId, projectId),
          organizationApi.listDependencies(workspaceId, projectId),
        ]);
        if (!isCurrent() || requestId !== latestLoad.current) return;
        setOverview(nextOverview);
        setDependencies(nextDependencies);
      } catch (cause) {
        if (isCurrent() && requestId === latestLoad.current) {
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
      await organizationApi.createEpic(workspaceId, projectId, title, undefined, {
        priority: epicPriority,
        tags: epicTags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
      setTitle('');
      setEpicPriority('medium');
      setEpicTags('');
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
        {
          kind: featureKind,
          tags: featureTags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
          ...(featureKind === 'bug'
            ? {
                bug_severity: bugSeverity,
                steps_to_reproduce: stepsToReproduce,
                expected_result: expectedResult,
                actual_result: actualResult,
              }
            : {}),
        },
      );
      setFeatureTitle('');
      setFeatureEpicId('');
      setFeatureKind('story');
      setBugSeverity('medium');
      setStepsToReproduce('');
      setExpectedResult('');
      setActualResult('');
      setFeatureTags('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create feature.');
    }
  }

  async function updateEpic(epic: Epic, status: EpicStatus) {
    try {
      await organizationApi.updateEpic(workspaceId, projectId, epic.id, { status });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update Epic status.');
    }
  }

  async function updateFeature(
    feature: Feature,
    values: Parameters<typeof organizationApi.updateFeature>[3],
  ) {
    try {
      const updated = await organizationApi.updateFeature(
        workspaceId,
        projectId,
        feature.id,
        values,
      );
      setOverview((current) => ({
        ...current,
        epics: current.epics.map((epic: Epic & { features: Feature[] }) => ({
          ...epic,
          features: epic.features.map((item: Feature) => (item.id === updated.id ? updated : item)),
        })),
        unassigned_features: current.unassigned_features.map((item: Feature) =>
          item.id === updated.id ? updated : item,
        ),
      }));
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
    actualResult,
    bugSeverity,
    featureName,
    featureTitle,
    featureEpicId,
    featureKind,
    featureTags,
    features,
    load,
    overview,
    priorityFilter,
    epicPriority,
    epicTags,
    removeDependency,
    search,
    setBlockedFeatureId,
    setBlockingFeatureId,
    setEpicFilter,
    setFeatureTitle,
    setFeatureEpicId,
    setFeatureKind,
    setFeatureTags,
    setBugSeverity,
    setStepsToReproduce,
    setExpectedResult,
    setActualResult,
    setEpicPriority,
    setEpicTags,
    stepsToReproduce,
    expectedResult,
    setPriorityFilter,
    setSearch,
    setStatusFilter,
    setTagFilter,
    setTitle,
    statusFilter,
    tagFilter,
    title,
    updateFeature,
    updateEpic,
    visibleFeatures,
  };
}
