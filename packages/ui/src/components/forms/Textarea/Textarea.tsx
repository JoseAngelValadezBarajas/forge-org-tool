import { forwardRef, type TextareaHTMLAttributes } from 'react';
import styles from './Textarea.module.css';
export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, ...props },
  ref,
) {
  return (
    <textarea
      {...props}
      ref={ref}
      className={[styles.textarea, className].filter(Boolean).join(' ')}
    />
  );
});
