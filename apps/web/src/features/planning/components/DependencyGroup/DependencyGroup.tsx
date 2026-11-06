import type { ReactNode } from 'react';
import { CardV2 } from '@corefoundry-labs/forge-ui';
import styles from './DependencyGroup.module.css';

export type DependencyGroupState = 'Blocked' | 'Clear' | 'Archived';

type DependencyGroupProps = {
  blocker: string;
  blocked: string;
  state?: DependencyGroupState;
  archived?: boolean;
  children?: ReactNode;
};

export function DependencyGroup({
  blocker,
  blocked,
  state = 'Blocked',
  archived = false,
  children,
}: DependencyGroupProps) {
  const displayState = archived ? 'Archived' : state;

  return (
    <CardV2
      data-layout="flow"
      variant="outlined"
      className={styles.group}
      data-state={displayState}
      role="group"
      aria-label={`${blocker} blocks ${blocked}`}
    >
      <p className={styles.state}>{displayState.toUpperCase()}</p>
      <p className={styles.relationship}>
        <strong>{blocker}</strong>
        <span aria-hidden="true"> blocks </span>
        <strong>{blocked}</strong>
      </p>
      {children}
    </CardV2>
  );
}
