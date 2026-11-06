import type { ReactNode } from 'react';
import type { Criterion } from '@forge-org/api-client';
import { BadgeV2, CheckboxV2 } from '@corefoundry-labs/forge-ui';
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
        <CheckboxV2
          aria-label={`Satisfy ${criterion.description}`}
          checked={criterion.satisfied}
          disabled={archived}
          onChange={(event) => onSatisfiedChange?.(event.target.checked)}
        />
      ) : (
        <BadgeV2 tone={criterion.satisfied ? 'success' : 'neutral'}>
          {criterion.satisfied ? 'Satisfied' : 'Pending'}
        </BadgeV2>
      )}
      <span className={styles.description}>{criterion.description}</span>
      {children}
    </li>
  );
}
