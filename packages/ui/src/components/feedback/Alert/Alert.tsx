import type { HTMLAttributes } from 'react';
import styles from './Alert.module.css';
export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: 'info' | 'success' | 'warning' | 'danger';
}
export function Alert({ tone = 'info', className, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      aria-live={tone === 'danger' ? 'assertive' : 'polite'}
      {...props}
      className={[styles.alert, styles[tone], className].filter(Boolean).join(' ')}
    />
  );
}
