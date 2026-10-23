import type { HTMLAttributes } from 'react';
import styles from './LoadingState.module.css';

export interface LoadingStateProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
}

export function LoadingState({ label = 'Loading', className, ...props }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-label={label}
      {...props}
      className={[styles.state, className].filter(Boolean).join(' ')}
    >
      <span aria-hidden="true" className={styles.spinner} />
      {label}
    </div>
  );
}
