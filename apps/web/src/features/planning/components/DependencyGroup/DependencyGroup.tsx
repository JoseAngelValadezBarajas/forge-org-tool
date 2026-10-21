import type { ReactNode } from 'react';
import { Card } from '@forge-org/ui';
import styles from './DependencyGroup.module.css';

type DependencyGroupProps = {
  blocker: string;
  blocked: string;
  archived?: boolean;
  children?: ReactNode;
};

export function DependencyGroup({
  blocker,
  blocked,
  archived = false,
  children,
}: DependencyGroupProps) {
  return (
    <Card
      className={styles.group}
      data-state={archived ? 'Archived' : 'Clear'}
      role="group"
      aria-label={`${blocker} blocks ${blocked}`}
    >
      <p className={styles.relationship}>
        <strong>{blocker}</strong>
        <span aria-hidden="true"> blocks </span>
        <strong>{blocked}</strong>
      </p>
      {children}
    </Card>
  );
}
