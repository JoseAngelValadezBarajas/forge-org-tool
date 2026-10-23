import type { HTMLAttributes } from 'react';
import styles from './Skeleton.module.css';
export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  kind?: 'text' | 'title' | 'avatar' | 'card' | 'list';
  label?: string;
}
export function Skeleton({ kind = 'text', label = 'Loading', className, ...props }: SkeletonProps) {
  return (
    <div
      {...props}
      aria-hidden="true"
      aria-label={label}
      data-kind={kind}
      className={[styles.skeleton, styles[kind], className].filter(Boolean).join(' ')}
    >
      {kind === 'list' &&
        [0, 1, 2].map((item) => (
          <span className={styles.listItem} data-skeleton-item key={item}>
            <span className={styles.listAvatar} />
            <span className={styles.listContent}>
              <span className={styles.listLine} />
              <span className={[styles.listLine, styles.listLineShort].join(' ')} />
            </span>
          </span>
        ))}
    </div>
  );
}
