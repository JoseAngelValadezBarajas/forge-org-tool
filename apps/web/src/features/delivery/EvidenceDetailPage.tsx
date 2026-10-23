import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, SectionHeader, StatusChip } from '@forge-org/ui';
import { organizationApi } from '@forge-org/api-client';
import type { Evidence } from '@forge-org/api-client';
import styles from './DeliveryDetails.module.css';

export function EvidenceDetailPage() {
  const { workspaceId = '', projectId = '', evidenceId = '' } = useParams();
  const [record, setRecord] = useState<Evidence | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void organizationApi
      .getEvidence(workspaceId, projectId, evidenceId)
      .then((value) => {
        if (active) setRecord(value);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load evidence.');
      });
    return () => {
      active = false;
    };
  }, [workspaceId, projectId, evidenceId]);

  return (
    <div className={styles.page}>
      <Link className={styles.back} to={`/delivery/${workspaceId}/${projectId}`}>
        ← Back to delivery
      </Link>
      <SectionHeader title="Evidence detail & provenance" />
      <p>Evidence record fields returned by the current API.</p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {!error && !record && <p role="status">Loading evidence…</p>}
      {record && (
        <>
          <Card>
            <h2>{record.title}</h2>
            <p>{record.summary}</p>
            <StatusChip>{record.provenance}</StatusChip>
          </Card>
          <Card>
            <h2>Record details</h2>
            <div className={styles.grid}>
              <Field label="Evidence ID">{record.id}</Field>
              <Field label="Status">{record.status}</Field>
              <Field label="Reference type">{record.reference_kind}</Field>
              <Field label="Reference">{record.reference_value}</Field>
              <Field label="Feature ID">{record.feature_id ?? 'Not associated'}</Field>
              <Field label="Created">{record.created_at || 'Not provided'}</Field>
            </div>
          </Card>
          <p className={styles.notice}>
            Provenance is displayed exactly as recorded. REPORTED does not mean verified. The API
            exposes no provenance event history or source audit trail.
          </p>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      {children}
    </div>
  );
}
