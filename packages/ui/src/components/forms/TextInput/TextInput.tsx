import { forwardRef, type InputHTMLAttributes } from 'react';
import styles from './TextInput.module.css';
export type TextInputProps = InputHTMLAttributes<HTMLInputElement>;
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { className, ...props },
  ref,
) {
  return (
    <input {...props} ref={ref} className={[styles.input, className].filter(Boolean).join(' ')} />
  );
});
