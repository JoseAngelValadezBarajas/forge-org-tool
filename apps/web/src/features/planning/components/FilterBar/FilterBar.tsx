import type { ReactNode } from 'react';
import styles from './FilterBar.module.css';

type FilterBarProps = { children: ReactNode; resultCount?: number; resultLabel?: string };

export function FilterBar({
  children,
  resultCount,
  resultLabel = 'planning items',
}: FilterBarProps) {
  return (
    <section
      className={styles.filters}
      aria-label="Filter planning items"
      data-state={
        resultCount === 0 ? 'NoResults' : resultCount === undefined ? 'Default' : 'Filtered'
      }
    >
      <div className={styles.controls}>{children}</div>
      {resultCount !== undefined && (
        <p className={styles.count} aria-live="polite">
          {resultCount} {resultLabel}
        </p>
      )}
    </section>
  );
}
