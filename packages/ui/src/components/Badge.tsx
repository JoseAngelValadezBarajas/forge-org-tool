import type { HTMLAttributes } from 'react';
import styles from '../primitives/Shared.module.css';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent';
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={[styles.badge, styles[`tone-${tone}`], className].filter(Boolean).join(' ')}
    />
  );
}
