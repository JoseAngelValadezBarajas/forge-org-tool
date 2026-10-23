import type { ReactNode } from 'react';
import styles from './ErrorState.module.css';

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
      className={[styles.state, className].filter(Boolean).join(' ')}
      aria-label={title}
    >
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {actions && <div className={styles.actions}>{actions}</div>}
    </section>
  );
}
