import { forwardRef, type InputHTMLAttributes } from 'react';
import styles from './Radio.module.css';
export type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;
export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { className, ...props },
  ref,
) {
  return (
    <input
      {...props}
      ref={ref}
      type="radio"
      className={[styles.radio, className].filter(Boolean).join(' ')}
    />
  );
});
