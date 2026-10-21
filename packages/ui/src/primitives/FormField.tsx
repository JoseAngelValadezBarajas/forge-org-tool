import type { ReactNode } from 'react';
import styles from './Shared.module.css';

export interface FormFieldProps {
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string;
  htmlFor?: string;
  className?: string;
}

export function FormField({ label, children, hint, error, htmlFor, className }: FormFieldProps) {
  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label htmlFor={htmlFor} className={styles.label}>
        {htmlFor ? (
          label
        ) : (
          <>
            {label}
            {children}
          </>
        )}
      </label>
      {htmlFor && children}
      {hint && (
        <small id="form-field-hint" className={styles.hint}>
          {hint}
        </small>
      )}
      {error && (
        <small id="form-field-error" className={styles.error} role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
