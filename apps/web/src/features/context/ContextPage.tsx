import { Link, useParams } from 'react-router-dom';
import { Button, Card, SectionHeader, StatusChip } from '@forge-org/ui';
import styles from './ContextPage.module.css';
import { useContextController } from './useContextController';
import { ContextPackageCard } from './components';
import { repositoryDisplayName } from '../repositories/index';

export function ContextPage() {
  const { workspaceId = '', projectId = '', featureId = '' } = useParams();
  const {
    error,
    link,
    load,
    linkedRepositories,
    loading,
    packages,
    preview,
    repositories,
    save,
    showPreview,
    unlink,
  } = useContextController(workspaceId, projectId, featureId);
  const linkedIds = new Set(linkedRepositories.map((repository) => repository.id));
  const downloadPath = (packageId: string, format: 'json' | 'markdown') =>
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/context/packages/${packageId}/download?format=${format}`;

  return (
    <div className={styles.stack}>
      <SectionHeader title="Feature context" eyebrow="FORGE / Metadata-only context" />
      <p>
        Context packages contain planning records and metadata-only observations. They never contain
        source content or remote data.
      </p>
      <p>
        <Link to={`/planning/${workspaceId}/${projectId}/features/${featureId}`}>
          Back to feature detail
        </Link>
      </p>
      {loading && <p role="status">Loading feature context…</p>}
      {error && (
        <div role="group" aria-label="Context loading error">
          <p role="alert">{error}</p>
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Retry loading context
          </Button>
        </div>
      )}
      <Card hidden={loading || Boolean(error)}>
        <h3>Linked repositories</h3>
        {linkedRepositories.length === 0 ? (
          <p>No repositories linked to this feature.</p>
        ) : (
          linkedRepositories.map((repository) => (
            <article className={styles.item} key={repository.id}>
              <div className={styles.row}>
                <div>
                  <StatusChip tone="success">linked</StatusChip>
                  <p className={styles.muted}>{repositoryDisplayName(repository.root_path)}</p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void unlink(repository)}
                  aria-label={`Unlink ${repository.root_path}`}
                >
                  Unlink
                </Button>
              </div>
            </article>
          ))
        )}
      </Card>
      <Card hidden={loading || Boolean(error)}>
        <h3>Available repositories</h3>
        {repositories.length === 0 ? (
          <p>No repositories connected.</p>
        ) : (
          repositories.map((repository) => (
            <article className={styles.item} key={repository.id}>
              <div className={styles.row}>
                <div>
                  <StatusChip tone={repository.status === 'connected' ? 'success' : 'neutral'}>
                    {repository.status}
                  </StatusChip>
                  <p className={styles.muted}>{repositoryDisplayName(repository.root_path)}</p>
                </div>
                {linkedIds.has(repository.id) ? (
                  <span>Linked</span>
                ) : (
                  <Button
                    type="button"
                    onClick={() => void link(repository)}
                    aria-label={`Link ${repository.root_path}`}
                  >
                    Link
                  </Button>
                )}
              </div>
            </article>
          ))
        )}
      </Card>
      <Card hidden={loading || Boolean(error)}>
        <div className={styles.previewHeader}>
          <h3>Context package preview</h3>
          <Button type="button" variant="secondary" onClick={() => void showPreview()}>
            Preview context package
          </Button>
        </div>
        {preview && (
          <div className={styles.item}>
            <p>
              <strong>Schema:</strong> {preview.schema_version}
            </p>
            <p>
              <strong>Fingerprint:</strong> {preview.fingerprint}
            </p>
            <pre className={styles.preview}>{preview.markdown}</pre>
            <div className={styles.actions}>
              <Button type="button" onClick={() => void save()}>
                Save context package
              </Button>
            </div>
          </div>
        )}
      </Card>
      <Card hidden={loading || Boolean(error)}>
        <h3>Saved packages</h3>
        {packages.length === 0 ? (
          <p>No saved context packages.</p>
        ) : (
          packages.map((item) => (
            <ContextPackageCard key={item.id} contextPackage={item}>
              <Link to={`/context/${workspaceId}/${projectId}/${featureId}/packages/${item.id}`}>
                Open context package
              </Link>
              <a href={downloadPath(item.id, 'json')}>JSON</a>
              <a href={downloadPath(item.id, 'markdown')}>Markdown</a>
            </ContextPackageCard>
          ))
        )}
      </Card>
    </div>
  );
}
