import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, SectionHeader } from '@forge-org/ui';
import { organizationApi, type ContextPackage } from '@forge-org/api-client';
import styles from './ContextPackageDetailPage.module.css';

export function ContextPackageDetailPage() {
  const { workspaceId = '', projectId = '', featureId = '', packageId = '' } = useParams();
  const [contextPackage, setContextPackage] = useState<ContextPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const nextPackage = await organizationApi.getContextPackage(
        workspaceId,
        projectId,
        featureId,
        packageId,
      );
      if (currentRequest === requestId.current) setContextPackage(nextPackage);
    } catch (cause) {
      if (currentRequest === requestId.current) {
        setError(cause instanceof Error ? cause.message : 'Unable to load context package.');
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [featureId, packageId, projectId, workspaceId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => {
      window.clearTimeout(timer);
      requestId.current += 1;
    };
  }, [load]);

  const downloadPath = (format: 'json' | 'markdown') =>
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/context/packages/${packageId}/download?format=${format}`;

  return (
    <div className={styles.stack}>
      <Link to={`/context/${workspaceId}/${projectId}/${featureId}`}>Back to context history</Link>
      <SectionHeader title="Context package snapshot" eyebrow="FORGE / Immutable provenance" />
      <p className={styles.provenance}>
        This is the saved snapshot as recorded. Inspecting it does not regenerate or update it.
      </p>
      {loading && (
        <p role="status" aria-live="polite">
          Loading saved context package…
        </p>
      )}
      {error && (
        <div className={styles.feedback}>
          <p role="alert">{error}</p>
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Retry loading package
          </Button>
        </div>
      )}
      {!loading && contextPackage && (
        <>
          <Card>
            <div className={styles.heading}>
              <h3>Snapshot provenance</h3>
              <div className={styles.downloads}>
                <a href={downloadPath('json')}>Download JSON</a>
                <a href={downloadPath('markdown')}>Download Markdown</a>
              </div>
            </div>
            <dl className={styles.metadata}>
              <div>
                <dt>Schema</dt>
                <dd>{contextPackage.schema_version}</dd>
              </div>
              <div>
                <dt>Fingerprint</dt>
                <dd className={styles.fingerprint}>{contextPackage.fingerprint}</dd>
              </div>
              <div>
                <dt>Feature</dt>
                <dd>{contextPackage.feature_id}</dd>
              </div>
              <div>
                <dt>Captured</dt>
                <dd>{contextPackage.created_at || 'Timestamp unavailable'}</dd>
              </div>
            </dl>
          </Card>
          <Card>
            <h3>Markdown snapshot</h3>
            <pre className={styles.content}>{contextPackage.markdown}</pre>
          </Card>
          <Card>
            <h3>JSON payload</h3>
            <pre className={styles.content}>{contextPackage.payload_json}</pre>
          </Card>
        </>
      )}
    </div>
  );
}
