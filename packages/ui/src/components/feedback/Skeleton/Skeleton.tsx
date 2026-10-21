import type { HTMLAttributes } from 'react';
import styles from './Skeleton.module.css';
export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  kind?: 'text' | 'title' | 'avatar' | 'card';
  label?: string;
}
export function Skeleton({ kind = 'text', label = 'Loading', className, ...props }: SkeletonProps) {
  return (
    <div
      {...props}
      aria-hidden="true"
      aria-label={label}
      className={[styles.skeleton, styles[kind], className].filter(Boolean).join(' ')}
    />
  );
}
