import { forwardRef, type ProgressHTMLAttributes } from 'react';
import styles from './Progress.module.css';
export interface ProgressProps extends ProgressHTMLAttributes<HTMLProgressElement> {
  label?: string;
}
export const Progress = forwardRef<HTMLProgressElement, ProgressProps>(function Progress(
  { label, className, ...props },
  ref,
) {
  return (
    <progress
      {...props}
      ref={ref}
      aria-label={label}
      className={[styles.progress, className].filter(Boolean).join(' ')}
    />
  );
});
