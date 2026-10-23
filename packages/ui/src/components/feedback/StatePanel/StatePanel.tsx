import type { HTMLAttributes, ReactNode } from 'react';
import styles from './StatePanel.module.css';
export interface StatePanelProps extends HTMLAttributes<HTMLDivElement> {
  kind?: 'loading' | 'empty' | 'readOnly' | 'error';
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}
export function StatePanel({
  kind = 'empty',
  title,
  description,
  action,
  className,
  ...props
}: StatePanelProps) {
  const role = kind === 'error' ? 'alert' : kind === 'loading' ? 'status' : undefined;
  return (
    <div
      {...props}
      role={role}
      aria-busy={kind === 'loading' || undefined}
      className={[styles.panel, styles[kind], className].filter(Boolean).join(' ')}
    >
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
