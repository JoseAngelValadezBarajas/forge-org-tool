import { Card } from '@forge-org/ui';
import styles from './TrustDisclosure.module.css';
export interface TrustDisclosureProps {
  children: React.ReactNode;
}
export function TrustDisclosure({ children }: TrustDisclosureProps) {
  return (
    <Card className={styles.disclosure}>
      <p role="note">{children}</p>
    </Card>
  );
}
