import { Button, Card, SectionHeader, StatusChip } from '@forge-org/ui';
import styles from './OrganizationEmptyState.module.css';
/** Feature-owned composition. UI primitives remain package-owned. */
export function OrganizationEmptyState() {
  return <div className={styles.stack}>
    <SectionHeader title="Organization" eyebrow="FORGE / M1 Foundation" />
    <Card>
      <StatusChip tone="warning">Not implemented</StatusChip>
      <h3>Build the first Workspace</h3>
      <p>Domain logic and SQLite-backed Workspaces are scheduled for M2. This page does not display fictitious project data.</p>
      <Button variant="secondary" disabled aria-label="Create workspace (not implemented)">Create Workspace</Button>
    </Card>
  </div>;
}
