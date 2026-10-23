import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, SectionHeader } from '@forge-org/ui';
import { organizationApi, type Observation, type Repository } from '@forge-org/api-client';
import { RepositoryCard } from './components';
import styles from './RepositoryDetailPage.module.css';

export function RepositoryDetailPage() {
  const { workspaceId = '', projectId = '', repositoryId = '' } = useParams();
  const [repository, setRepository] = useState<Repository | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const repositories = await organizationApi.listRepositories(workspaceId, projectId);
      const selected = repositories.find((item) => item.id === repositoryId);
      if (!selected) throw new Error('Repository is unavailable in this project.');
      const history = await organizationApi.listObservations(workspaceId, projectId, repositoryId);
      if (currentRequest === requestId.current) {
        setRepository(selected);
        setObservations(history);
      }
    } catch (cause) {
      if (currentRequest === requestId.current) {
        setError(cause instanceof Error ? cause.message : 'Unable to load repository details.');
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [projectId, repositoryId, workspaceId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(timer);
      requestId.current += 1;
    };
  }, [load]);

  return (
    <div className={styles.stack}>
      <Link to={`/repositories/${workspaceId}/${projectId}`}>Back to repositories</Link>
      <SectionHeader title="Repository detail" eyebrow="FORGE / Bounded Git metadata" />
      <p className={styles.provenance}>
        Read-only metadata observations only. Source files, absolute paths and remotes are not
        shown.
      </p>
      {loading && (
        <p role="status" aria-live="polite">
          Loading repository detail…
        </p>
      )}
      {error && (
        <div className={styles.feedback}>
          <p role="alert">{error}</p>
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Retry loading repository
          </Button>
        </div>
      )}
      {!loading && repository && (
        <RepositoryCard
          repository={repository}
          observation={observations[0]}
          history={observations}
        />
      )}
    </div>
  );
}
