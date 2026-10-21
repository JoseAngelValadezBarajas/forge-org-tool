import type { HTMLAttributes } from 'react';
import styles from './Toast.module.css';
export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  tone?: 'success' | 'error' | 'info';
}
export function Toast({ tone = 'success', className, ...props }: ToastProps) {
  return (
    <div
      {...props}
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      className={[styles.toast, styles[tone], className].filter(Boolean).join(' ')}
    />
  );
}
