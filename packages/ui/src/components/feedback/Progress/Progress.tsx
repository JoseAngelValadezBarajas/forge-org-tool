import { forwardRef, type ProgressHTMLAttributes } from 'react';
import styles from './Progress.module.css';
export interface ProgressProps extends ProgressHTMLAttributes<HTMLProgressElement> {
  label?: string;
  presentation?: 'native' | 'panel';
  note?: string;
}
export const Progress = forwardRef<HTMLProgressElement, ProgressProps>(function Progress(
  {
    label,
    className,
    presentation = 'native',
    note = 'Progress is not a release or CI verification claim.',
    value,
    max,
    ...props
  },
  ref,
) {
  const progress = (
    <progress
      {...props}
      value={value}
      max={max}
      ref={ref}
      aria-label={label}
      className={[styles.progress, className].filter(Boolean).join(' ')}
    />
  );

  if (presentation === 'native') return progress;

  const current = typeof value === 'number' ? value : 0;
  const total = typeof max === 'number' ? max : 1;
  const state = current <= 0 ? 'starting' : current >= total ? 'complete' : 'inProgress';

  return (
    <div className={styles.panel} data-state={state}>
      <div className={styles.heading}>
        <span>{label ?? 'Progress'}</span>
        <span className={styles.count}>
          {current} / {total}
        </span>
      </div>
      <progress
        {...props}
        value={value}
        max={max}
        ref={ref}
        aria-label={label ?? 'Progress'}
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        className={[styles.progress, className].filter(Boolean).join(' ')}
      />
      {note && <p className={styles.note}>{note}</p>}
    </div>
  );
});
