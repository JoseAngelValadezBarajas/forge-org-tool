import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Card, SectionHeader, StatusChip } from '@forge-org/ui';
import { organizationApi } from '@forge-org/api-client';
import type { Verification } from '@forge-org/api-client';
import styles from './DeliveryDetails.module.css';

type Rule = { id: string; label: string; description: string };
export function VerificationResultPage() {
  const { verificationId = '' } = useParams();
  const location = useLocation();
  const routeContext = location.state as { workspaceId?: string; projectId?: string } | null;
  const workspaceId = routeContext?.workspaceId ?? '';
  const projectId = routeContext?.projectId ?? '';
  const missingContext = !workspaceId || !projectId;
  const [result, setResult] = useState<Verification | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loadedFor, setLoadedFor] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    if (missingContext)
      return () => {
        active = false;
      };
    void Promise.all([
      organizationApi.listVerifications(workspaceId, projectId),
      organizationApi.listVerificationRules(workspaceId, projectId),
    ])
      .then(([results, availableRules]) => {
        if (active) {
          setResult(results.find((item) => item.id === verificationId) ?? null);
          setRules(availableRules);
          setLoadedFor(verificationId);
        }
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error ? reason.message : 'Could not load verification records.',
          );
      });
    return () => {
      active = false;
    };
  }, [workspaceId, projectId, verificationId, missingContext]);
  const rule = result ? rules.find((item) => item.id === result.rule_id) : undefined;
  return (
    <main className={styles.page}>
      <Link className={styles.back} to={`/delivery/${workspaceId}/${projectId}`}>
        ← Back to delivery
      </Link>
      <SectionHeader title="Verification result & trace" />
      <p>Recorded result from the project's verification history.</p>
      {missingContext && (
        <p className={styles.error} role="alert">
          Verification results need workspace and project context. Open one from Delivery.
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {!missingContext && !error && loadedFor !== verificationId && (
        <p role="status">Loading verification…</p>
      )}
      {!missingContext && !error && loadedFor === verificationId && !result && (
        <p role="alert">Verification not found in this project&apos;s history.</p>
      )}
      {result && (
        <>
          <Card>
            <h2>Recorded result</h2>
            <StatusChip>{result.outcome}</StatusChip>
            {result.stale && <p>Stale result</p>}
            {rule && (
              <p>
                {rule.label}: {rule.description}
              </p>
            )}
            <div className={styles.grid}>
              <Field label="Verification ID">{result.id}</Field>
              <Field label="Candidate ID">{result.candidate_id}</Field>
              <Field label="Rule ID">{result.rule_id}</Field>
              <Field label="Input fingerprint">{result.input_fingerprint}</Field>
              {result.created_at && <Field label="Recorded at">{result.created_at}</Field>}
            </div>
          </Card>
          <Card>
            <h2>Recorded blockers</h2>
            {result.blockers.length ? (
              <ul>
                {result.blockers.map((blocker: string, index: number) => (
                  <li key={`${index}-${blocker}`}>{blocker}</li>
                ))}
              </ul>
            ) : (
              <p>No blockers were recorded.</p>
            )}
          </Card>
          <p className={styles.notice}>
            The current API exposes outcome, stale flag, input fingerprint and blockers. It does not
            expose method, execution inputs, or expected-versus-actual trace; no deeper trace is
            available here.
          </p>
        </>
      )}
    </main>
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
