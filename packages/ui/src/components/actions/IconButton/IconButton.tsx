import { forwardRef, type ButtonHTMLAttributes } from 'react';
import styles from './IconButton.module.css';
export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { loading = false, disabled, className, children, ...props },
  ref,
) {
  return (
    <button
      {...props}
      ref={ref}
      type={props.type ?? 'button'}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[styles.button, className].filter(Boolean).join(' ')}
    >
      {children}
    </button>
  );
});
