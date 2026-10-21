import { forwardRef, type TextareaHTMLAttributes } from 'react';
import styles from './Textarea.module.css';
export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, 'aria-invalid': ariaInvalid, ...props },
  ref,
) {
  const invalid = ariaInvalid === true || ariaInvalid === 'true';
  return (
    <textarea
      {...props}
      aria-invalid={ariaInvalid}
      ref={ref}
      className={[styles.textarea, invalid && styles.invalid, className].filter(Boolean).join(' ')}
    />
  );
});
