import type { ReactNode } from 'react';
import { Card } from '@forge-org/ui';
import styles from './TrustDisclosure.module.css';
export type TrustDisclosureState = 'Default' | 'Expanded';

export interface TrustDisclosureProps {
  children: ReactNode;
  state?: TrustDisclosureState;
  title?: string;
}
export function TrustDisclosure({
  children,
  state = 'Default',
  title = 'REPORTED is not VERIFIED',
}: TrustDisclosureProps) {
  return (
    <Card className={styles.disclosure}>
      <div className={styles.content} role="note" data-state={state}>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.state}>{state.toUpperCase()}</p>
        <p className={styles.description}>References alone do not prove their claims</p>
        <div className={styles.details}>{children}</div>
        <small className={styles.reference}>delivery/TrustDisclosure · trust boundaries</small>
      </div>
    </Card>
  );
}
