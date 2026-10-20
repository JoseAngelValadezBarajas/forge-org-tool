import { forwardRef, type HTMLAttributes } from 'react';
import styles from './Card.module.css';
export type CardProps = HTMLAttributes<HTMLElement>;
export const Card = forwardRef<HTMLElement, CardProps>(function Card({ className, ...props }, ref) {
  return <section ref={ref} className={[styles.card, className].filter(Boolean).join(' ')} {...props} />;
});
