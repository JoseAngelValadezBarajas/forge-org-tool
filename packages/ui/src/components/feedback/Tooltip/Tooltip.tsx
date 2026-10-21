import {
  cloneElement,
  isValidElement,
  useId,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import styles from './Tooltip.module.css';
export interface TooltipProps extends Omit<
  HTMLAttributes<HTMLSpanElement>,
  'content' | 'children'
> {
  content: ReactNode;
  children: ReactElement<{ 'aria-describedby'?: string }>;
}
export function Tooltip({ content, children, className, ...props }: TooltipProps) {
  const id = `forge-tooltip-${useId().replace(/:/g, '')}`;
  const child = isValidElement(children)
    ? cloneElement(children, {
        'aria-describedby': [children.props['aria-describedby'], id].filter(Boolean).join(' '),
      })
    : children;
  return (
    <span {...props} className={[styles.root, className].filter(Boolean).join(' ')}>
      {child}
      <span id={id} role="tooltip" className={styles.content}>
        {content}
      </span>
    </span>
  );
}
