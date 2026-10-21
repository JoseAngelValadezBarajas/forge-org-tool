import type { ReactNode } from 'react';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, actions, className }: EmptyStateProps) {
  return (
    <section className={[styles.state, className].filter(Boolean).join(' ')} aria-label={title}>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {actions && <div className={styles.actions}>{actions}</div>}
    </section>
  );
}
