import { forwardRef, type ButtonHTMLAttributes, type MouseEvent } from 'react';
import styles from './MenuItem.module.css';
export interface MenuItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onSelect'> {
  onSelect?: () => void;
  destructive?: boolean;
  selected?: boolean;
}
export const MenuItem = forwardRef<HTMLButtonElement, MenuItemProps>(function MenuItem(
  { onSelect, disabled, destructive = false, selected = false, className, onClick, ...props },
  ref,
) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented && !disabled) onSelect?.();
  };
  return (
    <button
      {...props}
      ref={ref}
      type="button"
      role="menuitem"
      aria-disabled={disabled || undefined}
      aria-current={selected ? 'true' : undefined}
      data-selected={selected || undefined}
      tabIndex={disabled ? -1 : props.tabIndex}
      disabled={disabled}
      onClick={handleClick}
      className={[styles.item, destructive && styles.destructive, className]
        .filter(Boolean)
        .join(' ')}
    />
  );
});
