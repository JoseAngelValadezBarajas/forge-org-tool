import type { ReactNode } from 'react';
import type { Criterion } from '@forge-org/api-client';
import { StatusChip } from '@forge-org/ui';
import styles from './CriterionItem.module.css';

type CriterionItemProps = {
  criterion: Criterion;
  editing?: boolean;
  archived?: boolean;
  children?: ReactNode;
};

export function CriterionItem({
  criterion,
  editing = false,
  archived = false,
  children,
}: CriterionItemProps) {
  const state = archived
    ? 'Archived'
    : editing
      ? 'Editing'
      : criterion.satisfied
        ? 'Satisfied'
        : 'Pending';
  return (
    <li className={styles.item} data-state={state}>
      <StatusChip tone={criterion.satisfied ? 'success' : 'neutral'}>
        {criterion.satisfied ? 'Satisfied' : 'Pending'}
      </StatusChip>
      <span className={styles.description}>{criterion.description}</span>
      {children}
    </li>
  );
}
