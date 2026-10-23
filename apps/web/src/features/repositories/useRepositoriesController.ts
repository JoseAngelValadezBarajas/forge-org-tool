import { useCallback, useEffect, useState } from 'react';
import { organizationApi, type Observation, type Repository } from '@forge-org/api-client';

export function useRepositoriesController(workspaceId: string, projectId: string) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [observations, setObservations] = useState<Record<string, Observation[]>>({});
  const [rootPath, setRootPath] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      setLoading(true);
      setError('');
      try {
        const nextRepositories = await organizationApi.listRepositories(workspaceId, projectId);
        const nextObservations = await Promise.all(
          nextRepositories.map(
            async (repository) =>
              [
                repository.id,
                await organizationApi.listObservations(workspaceId, projectId, repository.id),
              ] as const,
          ),
        );
        if (!isCurrent()) return;
        setError('');
        setRepositories(nextRepositories);
        setObservations(Object.fromEntries(nextObservations));
        setLoading(false);
      } catch (cause) {
        if (isCurrent()) {
          setError(cause instanceof Error ? cause.message : 'Unable to load repositories.');
          setLoading(false);
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

  async function connect(event: React.FormEvent) {
    event.preventDefault();
    if (!rootPath.trim()) return;
    try {
      await organizationApi.connectRepository(workspaceId, projectId, rootPath.trim());
      setRootPath('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to connect repository.');
    }
  }

  async function observe(repository: Repository) {
    try {
      await organizationApi.observeRepository(workspaceId, projectId, repository.id);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to observe repository.');
    }
  }

  async function disconnect(repository: Repository) {
    try {
      await organizationApi.disconnectRepository(workspaceId, projectId, repository.id);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to disconnect repository.');
    }
  }

  return {
    connect,
    disconnect,
    error,
    load,
    loading,
    observe,
    observations,
    repositories,
    rootPath,
    setRootPath,
  };
}
