import { useParams } from 'react-router-dom';
import { Button, Card, FormField, Input, SectionHeader } from '@forge-org/ui';
import styles from './RepositoriesPage.module.css';
import { useRepositoriesController } from './useRepositoriesController';
import { RepositoryCard } from './components';

export function RepositoriesPage() {
  const { workspaceId = '', projectId = '' } = useParams();
  const { connect, disconnect, error, observe, observations, repositories, rootPath, setRootPath } =
    useRepositoriesController(workspaceId, projectId);
  return (
    <div className={styles.stack}>
      <SectionHeader title="Repositories" eyebrow="FORGE / Metadata-only context" />
      <p>
        Connections are optional, allowlisted, read-only Git observations. FORGE never reads source
        content or contacts remotes.
      </p>
      {error && <p role="alert">{error}</p>}
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
        {repositories.length === 0 ? (
          <p>No repositories connected.</p>
        ) : (
          repositories.map((repository) => (
            <RepositoryCard
              key={repository.id}
              repository={repository}
              observation={observations[repository.id]?.[0]}
            >
              <Button variant="secondary" onClick={() => void observe(repository)}>
                Observe metadata
              </Button>
              <Button
                variant="secondary"
                onClick={() => void disconnect(repository)}
                aria-label={`Disconnect ${repository.root_path}`}
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
