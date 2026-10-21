import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, SectionHeader, StatusChip } from '@forge-org/ui';
import { organizationApi, type ContextPackage, type Repository } from '@forge-org/api-client';
import styles from './ContextPage.module.css';

type ContextPreview = {
  schema_version: string;
  fingerprint: string;
  payload: unknown;
  markdown: string;
};

export function ContextPage() {
  const { workspaceId = '', projectId = '', featureId = '' } = useParams();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [linkedRepositories, setLinkedRepositories] = useState<Repository[]>([]);
  const [packages, setPackages] = useState<ContextPackage[]>([]);
  const [preview, setPreview] = useState<ContextPreview | null>(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const [nextRepositories, nextLinked, nextPackages] = await Promise.all([
        organizationApi.listRepositories(workspaceId, projectId),
        organizationApi.listFeatureRepositories(workspaceId, projectId, featureId),
        organizationApi.listContextPackages(workspaceId, projectId, featureId),
      ]);
      setRepositories(nextRepositories);
      setLinkedRepositories(nextLinked);
      setPackages(nextPackages);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load feature context.');
    }
  }
  useEffect(() => {
    void load();
  }, [workspaceId, projectId, featureId]);

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
      {error && <p role="alert">{error}</p>}
      <p>
        <Link to={`/planning/${workspaceId}/${projectId}/features/${featureId}`}>
          Back to feature detail
        </Link>
      </p>
      <Card>
        <h3>Linked repositories</h3>
        {linkedRepositories.length === 0 ? (
          <p>No repositories linked to this feature.</p>
        ) : (
          linkedRepositories.map((repository) => (
            <article className={styles.item} key={repository.id}>
              <div className={styles.row}>
                <div>
                  <StatusChip tone="success">linked</StatusChip>
                  <p className={styles.muted}>{repository.root_path}</p>
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
      <Card>
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
                  <p className={styles.muted}>{repository.root_path}</p>
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
      <Card>
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
      <Card>
        <h3>Saved packages</h3>
        {packages.length === 0 ? (
          <p>No saved context packages.</p>
        ) : (
          packages.map((item) => (
            <article className={styles.item} key={item.id}>
              <div className={styles.row}>
                <div>
                  <StatusChip tone="neutral">{item.schema_version}</StatusChip>
                  <p>Saved package {item.fingerprint}</p>
                </div>
                <div className={styles.links}>
                  <a href={downloadPath(item.id, 'json')}>JSON</a>
                  <a href={downloadPath(item.id, 'markdown')}>Markdown</a>
                </div>
              </div>
            </article>
          ))
        )}
      </Card>
    </div>
  );
}
