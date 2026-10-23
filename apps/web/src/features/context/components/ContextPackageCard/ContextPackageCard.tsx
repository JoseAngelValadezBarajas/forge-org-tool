import type { ReactNode } from 'react';
import { Card, StatusChip } from '@forge-org/ui';
import type { ContextPackage } from '@forge-org/api-client';
import styles from './ContextPackageCard.module.css';

export type ContextPackageState = 'Fresh' | 'Stale' | 'Unavailable';
type ContextPackageCardProps = {
  contextPackage?: ContextPackage;
  state?: ContextPackageState;
  children?: ReactNode;
};

export function ContextPackageCard({ contextPackage, state, children }: ContextPackageCardProps) {
  if (!contextPackage) {
    return (
      <Card className={styles.card} data-state="Unavailable">
        <h3>Context package unavailable</h3>
        <p>No saved snapshot is available for this feature.</p>
        {children}
      </Card>
    );
  }
  return (
    <Card className={styles.card} data-state={state ?? 'UnverifiedFreshness'}>
      <header className={styles.heading}>
        <h3>Saved context package</h3>
        {state && (
          <StatusChip tone={state === 'Fresh' ? 'success' : 'warning'}>
            {state.toUpperCase()}
          </StatusChip>
        )}
      </header>
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
          <dt>Captured</dt>
          <dd>{contextPackage.created_at || 'timestamp unavailable'}</dd>
        </div>
      </dl>
      {!state && (
        <p className={styles.note}>
          Saved snapshot; freshness against current inputs has not been evaluated.
        </p>
      )}
      {children && <div className={styles.actions}>{children}</div>}
    </Card>
  );
}
