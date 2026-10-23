import styles from './XCircle.module.css';
import { createIcon } from '../../createIcon.js';
export const XCircle = createIcon(
  'XCircle',
  'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm-3-13 6 6m0-6-6 6',
  styles.icon,
);
