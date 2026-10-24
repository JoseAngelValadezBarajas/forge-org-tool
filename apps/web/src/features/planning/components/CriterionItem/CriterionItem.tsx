import type { ReactNode } from 'react';
import type { Criterion } from '@forge-org/api-client';
import { Checkbox, StatusChip } from '@forge-org/ui';
import styles from './CriterionItem.module.css';

type CriterionItemProps = {
  criterion: Criterion;
  editing?: boolean;
  archived?: boolean;
  children?: ReactNode;
  compact?: boolean;
  onSatisfiedChange?: (satisfied: boolean) => void;
};

export function CriterionItem({
  criterion,
  editing = false,
  archived = false,
  children,
  compact = false,
  onSatisfiedChange,
}: CriterionItemProps) {
  const state = archived
    ? 'Archived'
    : editing
      ? 'Editing'
      : criterion.satisfied
        ? 'Satisfied'
        : 'Pending';
  return (
    <li
      className={[styles.item, compact && styles.compact].filter(Boolean).join(' ')}
      data-state={state}
    >
      {compact ? (
        <Checkbox
          aria-label={`Satisfy ${criterion.description}`}
          checked={criterion.satisfied}
          disabled={archived}
          onChange={(event) => onSatisfiedChange?.(event.target.checked)}
        />
      ) : (
        <StatusChip tone={criterion.satisfied ? 'success' : 'neutral'}>
          {criterion.satisfied ? 'Satisfied' : 'Pending'}
        </StatusChip>
      )}
      <span className={styles.description}>{criterion.description}</span>
      {children}
    </li>
  );
}
