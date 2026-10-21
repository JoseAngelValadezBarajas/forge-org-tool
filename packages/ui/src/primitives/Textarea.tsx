import { forwardRef, type TextareaHTMLAttributes } from 'react';
import styles from './Shared.module.css';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} {...props} className={[styles.control, styles.textarea, className].filter(Boolean).join(' ')} />;
});
