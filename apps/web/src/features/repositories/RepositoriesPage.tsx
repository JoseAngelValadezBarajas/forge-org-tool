import { Link, useParams } from 'react-router-dom';
import { Button, Card, FormField, Input, SectionHeader } from '@forge-org/ui';
import styles from './RepositoriesPage.module.css';
import { useRepositoriesController } from './useRepositoriesController';
import { RepositoryCard } from './components';
import { repositoryDisplayName } from './repositoryDisplayName';

export function RepositoriesPage() {
  const { workspaceId = '', projectId = '' } = useParams();
  const {
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
  } = useRepositoriesController(workspaceId, projectId);
  return (
    <div className={styles.stack}>
      <SectionHeader title="Repositories" eyebrow="FORGE / Metadata-only context" />
      <p>
        Connections are optional, allowlisted, read-only Git observations. FORGE never reads source
        content or contacts remotes.
      </p>
      <Card>
        <form onSubmit={connect} className={styles.form}>
          <FormField label="Approved local Git root">
            <Input
              id="repository-path"
              value={rootPath}
              onChange={(event) => setRootPath(event.target.value)}
              placeholder="C:\\approved\\project"
              required
            />
          </FormField>
          <Button type="submit">Connect Repository</Button>
        </form>
      </Card>
      <section className={styles.connections} aria-labelledby="repository-connections-heading">
        <h3 id="repository-connections-heading">Connections</h3>
        {loading ? (
          <p role="status">Loading repositories…</p>
        ) : error ? (
          <div role="group" aria-label="Repository loading error">
            <p role="alert">{error}</p>
            <Button type="button" variant="secondary" onClick={() => void load()}>
              Retry loading repositories
            </Button>
          </div>
        ) : repositories.length === 0 ? (
          <p>No repositories connected.</p>
        ) : (
          repositories.map((repository) => (
            <RepositoryCard
              key={repository.id}
              repository={repository}
              observation={observations[repository.id]?.[0]}
              history={observations[repository.id] ?? []}
            >
              <Link to={`/repositories/${workspaceId}/${projectId}/${repository.id}`}>
                View repository {repositoryDisplayName(repository.root_path)}
              </Link>
              <Button variant="secondary" onClick={() => void observe(repository)}>
                Observe metadata
              </Button>
              <Button
                variant="secondary"
                onClick={() => void disconnect(repository)}
                aria-label={`Disconnect ${repositoryDisplayName(repository.root_path)}`}
              >
                Disconnect
              </Button>
            </RepositoryCard>
          ))
        )}
      </section>
    </div>
  );
}
