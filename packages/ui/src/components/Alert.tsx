import type { HTMLAttributes } from 'react';
import styles from '../primitives/Shared.module.css';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: 'info' | 'success' | 'warning' | 'danger';
}

export function Alert({ tone = 'info', className, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      {...props}
      className={[styles.alert, styles[`tone-${tone}`], className].filter(Boolean).join(' ')}
    />
  );
}
