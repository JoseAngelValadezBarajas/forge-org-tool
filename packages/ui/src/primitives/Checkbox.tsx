import { forwardRef, type InputHTMLAttributes } from 'react';
import styles from './Shared.module.css';

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ className, ...props }, ref) {
  return <input ref={ref} type="checkbox" {...props} className={[styles.checkbox, className].filter(Boolean).join(' ')} />;
});
