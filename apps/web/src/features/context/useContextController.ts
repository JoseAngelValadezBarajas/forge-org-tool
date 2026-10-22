import { useCallback, useEffect, useState } from 'react';
import { organizationApi, type ContextPackage, type Repository } from '@forge-org/api-client';

export type ContextPreview = {
  schema_version: string;
  fingerprint: string;
  payload: unknown;
  markdown: string;
};

export function useContextController(workspaceId: string, projectId: string, featureId: string) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [linkedRepositories, setLinkedRepositories] = useState<Repository[]>([]);
  const [packages, setPackages] = useState<ContextPackage[]>([]);
  const [preview, setPreview] = useState<ContextPreview | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      try {
        const [nextRepositories, nextLinked, nextPackages] = await Promise.all([
          organizationApi.listRepositories(workspaceId, projectId),
          organizationApi.listFeatureRepositories(workspaceId, projectId, featureId),
          organizationApi.listContextPackages(workspaceId, projectId, featureId),
        ]);
        if (!isCurrent()) return;
        setError('');
        setRepositories(nextRepositories);
        setLinkedRepositories(nextLinked);
        setPackages(nextPackages);
      } catch (cause) {
        if (isCurrent()) {
          setError(cause instanceof Error ? cause.message : 'Unable to load feature context.');
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

  async function link(repository: Repository) {
    try {
      await organizationApi.linkFeatureRepository(workspaceId, projectId, featureId, repository.id);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to link repository.');
    }
  }

  async function unlink(repository: Repository) {
    try {
      await organizationApi.unlinkFeatureRepository(
        workspaceId,
        projectId,
        featureId,
        repository.id,
      );
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to remove repository link.');
    }
  }

  async function showPreview() {
    try {
      setPreview(await organizationApi.previewContext(workspaceId, projectId, featureId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to preview context package.');
    }
  }

  async function save() {
    try {
      await organizationApi.saveContext(workspaceId, projectId, featureId);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save context package.');
    }
  }

  return {
    error,
    link,
    linkedRepositories,
    load,
    packages,
    preview,
    repositories,
    save,
    showPreview,
    unlink,
  };
}
