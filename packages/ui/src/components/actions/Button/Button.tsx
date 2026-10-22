import { forwardRef, type ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  loadingLabel?: string;
}
export type ButtonSize = NonNullable<ButtonProps['size']>;
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'medium',
    loading = false,
    loadingLabel = 'Working…',
    disabled,
    children,
    className,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      className={[styles.button, styles[variant], styles[size], className]
        .filter(Boolean)
        .join(' ')}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-label={loading ? (props['aria-label'] ?? loadingLabel) : props['aria-label']}
    >
      {loading && (
        <span className={styles.loadingIndicator} aria-hidden="true">
          ···
        </span>
      )}
      {children}
    </button>
  );
});
