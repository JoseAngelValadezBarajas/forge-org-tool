import styles from './Clock.module.css';
import { createIcon } from '../../createIcon.js';
export const Clock = createIcon(
  'Clock',
  'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-16v6l4 2',
  styles.icon,
);
