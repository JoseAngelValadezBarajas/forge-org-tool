import {
  createElement,
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ElementType,
} from 'react';
import styles from './Card.module.css';
type CardElement = Extract<ElementType, 'div' | 'section' | 'article' | 'aside'>;
export type CardProps<T extends CardElement = 'div'> = {
  as?: T;
  className?: string;
  variant?: 'default' | 'elevated';
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className'>;
export const Card = forwardRef(function Card<T extends CardElement = 'div'>(
  { as, className, variant = 'default', ...props }: CardProps<T>,
  ref: React.ForwardedRef<ElementRef<T>>,
) {
  return createElement(as ?? 'div', {
    ...props,
    ref,
    'data-variant': variant,
    className: [styles.card, styles[variant], className].filter(Boolean).join(' '),
  });
}) as <T extends CardElement = 'div'>(
  props: CardProps<T> & { ref?: React.ForwardedRef<ElementRef<T>> },
) => React.ReactElement | null;
