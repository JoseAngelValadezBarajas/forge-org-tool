import { forwardRef, type ProgressHTMLAttributes } from 'react';
import styles from '../primitives/Shared.module.css';

export interface ProgressProps extends ProgressHTMLAttributes<HTMLProgressElement> { label?: string; }

export const Progress = forwardRef<HTMLProgressElement, ProgressProps>(function Progress({ label, className, ...props }, ref) {
  return <progress ref={ref} aria-label={label} {...props} className={[styles.progress, className].filter(Boolean).join(' ')} />;
});
