import type { ReactNode } from 'react';
import type { ReadinessResult } from '@forge-org/api-client';
import { Card, StatusChip } from '@forge-org/ui';
import styles from './FeatureOverview.module.css';

type FeatureOverviewProps = { result: ReadinessResult | null; children?: ReactNode };

export function FeatureOverview({ result, children }: FeatureOverviewProps) {
  const state = !result ? 'Unavailable' : result.outcome === 'READY_TO_START' ? 'Ready' : 'Blocked';
  return (
    <section className={styles.overview} aria-label="Feature readiness overview" data-state={state}>
      <Card>
        <div className={styles.heading}>
          <h2>Readiness evaluation</h2>
          <StatusChip
            tone={state === 'Ready' ? 'success' : state === 'Blocked' ? 'warning' : 'neutral'}
          >
            {state === 'Ready' ? 'Ready to start' : state}
          </StatusChip>
        </div>
        {result ? (
          <>
            <p>
              Rule set {result.rule_set_version} · {result.passed_checks.length} checks passed
            </p>
            <p className={styles.fingerprint}>Input fingerprint: {result.input_fingerprint}</p>
            {result.blockers.length > 0 && (
              <ul>
                {result.blockers.map((blocker) => (
                  <li key={blocker.code}>{blocker.message}</li>
                ))}
              </ul>
            )}
            {result.stale && (
              <p role="status">This evaluation is stale because its inputs have changed.</p>
            )}
          </>
        ) : (
          <p>Readiness has not been evaluated.</p>
        )}
        {children && <div className={styles.actions}>{children}</div>}
      </Card>
    </section>
  );
}
