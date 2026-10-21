import type { ReactNode } from 'react';
import styles from '../primitives/Shared.module.css';

export interface ErrorStateProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function ErrorState({ title, description, actions, className }: ErrorStateProps) {
  return (
    <section
      role="alert"
      className={[styles.state, styles.errorState, className].filter(Boolean).join(' ')}
    >
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {actions && <div className={styles.stateActions}>{actions}</div>}
    </section>
  );
}
