import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';
import styles from './FormField.module.css';
type ControlProps = {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'false' | 'true';
};
export interface FormFieldProps {
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string;
  htmlFor?: string;
  className?: string;
}
export function FormField({ label, children, hint, error, htmlFor, className }: FormFieldProps) {
  const id = `forge-field-${useId().replace(/:/g, '')}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const child = isValidElement(children) ? (children as ReactElement<ControlProps>) : undefined;
  const controlId = htmlFor ?? child?.props.id ?? id;
  const describedBy = [child?.props['aria-describedby'], hintId, errorId].filter(Boolean).join(' ');
  const enhanced = child
    ? cloneElement(child, {
        id: child.props.id ?? controlId,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? true : child.props['aria-invalid'],
      })
    : children;
  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      {child ? (
        <label htmlFor={controlId} className={styles.label}>
          {label}
        </label>
      ) : (
        <label className={styles.label}>
          {label}
          {children}
        </label>
      )}
      {child && enhanced}
      {hint && (
        <small id={hintId} className={styles.hint}>
          {hint}
        </small>
      )}
      {error && (
        <small id={errorId} className={styles.error} role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
