import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Alert.module.css';
export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'error';
  heading?: ReactNode;
  message?: ReactNode;
}
export function Alert({
  tone = 'info',
  heading,
  message,
  children,
  className,
  ...props
}: AlertProps) {
  const hasComposition = heading != null || message != null;
  return (
    <div
      role="alert"
      aria-live={tone === 'danger' || tone === 'error' ? 'assertive' : 'polite'}
      data-tone={tone}
      {...props}
      className={[styles.alert, styles[tone === 'error' ? 'error' : tone], className]
        .filter(Boolean)
        .join(' ')}
    >
      {hasComposition ? (
        <>
          {heading != null && <div className={styles.title}>{heading}</div>}
          {(message ?? children) != null && (
            <div className={styles.message}>{message ?? children}</div>
          )}
        </>
      ) : (
        children
      )}
    </div>
  );
}
