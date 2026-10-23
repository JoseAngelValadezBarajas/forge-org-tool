import type { ReactNode } from 'react';
import { Card } from '@forge-org/ui';
import styles from './ProvenanceNotice.module.css';
export type ProvenanceNoticeState = 'Reported' | 'Observed' | 'Unknown';

export interface ProvenanceNoticeProps {
  source: string;
  state?: ProvenanceNoticeState;
  title?: string;
  children?: ReactNode;
}

function stateDescription(state: ProvenanceNoticeState) {
  if (state === 'Observed') return 'Observation alone does not establish independent verification.';
  if (state === 'Unknown') return 'Unknown provenance is not treated as verified evidence.';
  return 'Claimed execution is not observed verification.';
}

function sourceDescription(state: ProvenanceNoticeState, source: string) {
  if (state === 'Observed') return `Observed source: ${source}.`;
  if (state === 'Unknown') return `Provenance source unknown: ${source}.`;
  return `Reported provenance: ${source}. This information is not independently verified.`;
}

export function ProvenanceNotice({
  source,
  state = 'Reported',
  title = 'Reporting boundary',
  children,
}: ProvenanceNoticeProps) {
  return (
    <Card className={styles.notice}>
      <div className={styles.content} role="note" data-state={state}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.state}>{state.toUpperCase()}</p>
        <p className={styles.description}>{stateDescription(state)}</p>
        <p className={styles.source}>
          {sourceDescription(state, source)} {children}
        </p>
        <small className={styles.reference}>workbench/ProvenanceBanner · provenance</small>
      </div>
    </Card>
  );
}
