import { NavLink, type NavLinkProps } from 'react-router-dom';
import styles from './NavigationItem.module.css';
export interface NavigationItemProps extends Omit<NavLinkProps, 'children'> {
  label: string;
}
export function NavigationItem({ label, className, ...props }: NavigationItemProps) {
  return (
    <NavLink
      {...props}
      className={({ isActive }) =>
        [styles.item, isActive && styles.active, typeof className === 'string' ? className : '']
          .filter(Boolean)
          .join(' ')
      }
    >
      {label}
    </NavLink>
  );
}
