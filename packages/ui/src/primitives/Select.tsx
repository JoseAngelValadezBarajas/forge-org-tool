import { forwardRef, type SelectHTMLAttributes } from 'react';
import styles from './Shared.module.css';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, ...props }, ref) {
  return <select ref={ref} {...props} className={[styles.control, className].filter(Boolean).join(' ')} />;
});
