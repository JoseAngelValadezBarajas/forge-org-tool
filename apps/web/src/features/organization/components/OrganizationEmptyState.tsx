import { Button, Card, SectionHeader, StatusChip } from '@forge-org/ui';
import styles from './OrganizationEmptyState.module.css';
/** Feature-owned composition. UI primitives remain package-owned. */
export function OrganizationEmptyState() {
  return <div className={styles.stack}>
    <SectionHeader title="Organization" eyebrow="FORGE / M1 Foundation" />
    <Card>
      <StatusChip tone="warning">Fixture</StatusChip>
      <h3>No workspace fixture</h3>
      <p>This backend-free Component Host preview keeps the empty-state composition deterministic.</p>
      <Button variant="secondary" disabled aria-label="Create workspace (fixture only)">Create Workspace</Button>
    </Card>
  </div>;
}
