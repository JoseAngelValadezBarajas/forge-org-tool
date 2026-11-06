import { BadgeV2, ButtonV2, CardV2, SectionHeader } from '@corefoundry-labs/forge-ui';
import styles from './OrganizationEmptyState.module.css';
/** Feature-owned composition. UI primitives remain package-owned. */
export function OrganizationEmptyState() {
  return (
    <div className={styles.stack}>
      <SectionHeader title="Organization" eyebrow="FORGE / M1 Foundation" />
      <CardV2 variant="outlined">
        <BadgeV2 tone="warning">Fixture</BadgeV2>
        <h3>No workspace fixture</h3>
        <p>
          This backend-free Component Host preview keeps the empty-state composition deterministic.
        </p>
        <ButtonV2 variant="secondary" disabled aria-label="Create workspace (fixture only)">
          Create Workspace
        </ButtonV2>
      </CardV2>
    </div>
  );
}
