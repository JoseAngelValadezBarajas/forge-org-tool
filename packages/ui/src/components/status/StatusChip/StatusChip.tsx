import type { HTMLAttributes } from 'react';
import styles from './StatusChip.module.css';
export interface StatusChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'reported';
}
export function StatusChip({ tone = 'neutral', children, className, ...props }: StatusChipProps) {
  return (
    <span
      {...props}
      data-tone={tone}
      className={[styles.chip, styles[tone], className].filter(Boolean).join(' ')}
    >
      {children}
    </span>
  );
}
