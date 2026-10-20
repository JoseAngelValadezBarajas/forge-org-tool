import type { InputHTMLAttributes } from 'react';
import styles from './Input.module.css';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return <input {...props} className={[styles.input, className].filter(Boolean).join(' ')} />;
}
