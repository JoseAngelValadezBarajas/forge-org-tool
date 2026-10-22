import type { ReactNode } from 'react';
import {
  Badge,
  Button,
  Card,
  CodeLabel,
  KeyValueRow,
  MetricCard,
  RecordRow,
  SectionHeader,
  StatusChip,
  Table,
  TableRow,
} from '@forge-org/ui';
import styles from '../ComponentGallery.module.css';

export function renderSurfaceDataPreview(componentId: string): ReactNode | null {
  switch (componentId) {
    case 'section-header':
      return (
        <Card>
          <SectionHeader
            headingLevel={3}
            eyebrow="Shared composition"
            title="SectionHeader"
            counter={12}
            actions={<Button variant="ghost">Action</Button>}
          />
        </Card>
      );
    case 'card':
      return (
        <div className={styles.previewRow}>
          <Card>
            <strong>Default</strong>
            <p>Neutral surface</p>
          </Card>
          <Card variant="elevated">
            <strong>Elevated</strong>
            <p>Raised surface</p>
          </Card>
        </div>
      );
    case 'metric-card':
      return <MetricCard label="Projects" value="12" detail="active records" />;
    case 'badge':
      return (
        <div className={styles.previewRow}>
          <Badge tone="neutral">Neutral</Badge>
          <Badge tone="accent">Accent</Badge>
          <Badge tone="info">Info</Badge>
        </div>
      );
    case 'status-chip':
      return (
        <Card>
          <div className={styles.previewRow}>
            <StatusChip>Neutral</StatusChip>
            <StatusChip tone="accent">Accent</StatusChip>
            <StatusChip tone="success">Success</StatusChip>
            <StatusChip tone="warning">Warning</StatusChip>
            <StatusChip tone="danger">Danger</StatusChip>
            <StatusChip tone="info">Info</StatusChip>
            <StatusChip tone="reported">Reported</StatusChip>
          </div>
        </Card>
      );
    case 'record-row':
      return (
        <Card>
          <table className={styles.tablePreview}>
            <tbody>
              <RecordRow
                title="Planning review"
                metadata="FEAT-012 · reported manually"
                status={<StatusChip tone="success">Complete</StatusChip>}
              />
              <RecordRow title="Selected item" metadata="Current selection" selected />
              <RecordRow title="Read-only item" metadata="Imported context" readOnly />
            </tbody>
          </table>
        </Card>
      );
    case 'key-value-row':
      return (
        <Card>
          <dl className={styles.keyValues}>
            <KeyValueRow label="Branch" value={<CodeLabel>main</CodeLabel>} />
            <KeyValueRow label="Observation" value="Read only" muted />
          </dl>
        </Card>
      );
    case 'table-row':
      return (
        <Card>
          <table className={styles.tablePreview}>
            <tbody>
              <TableRow header cells={['Evidence', 'Scope', 'State']} />
              <TableRow cells={['Build output', 'FEAT-012', 'Observed']} />
              <TableRow warning cells={['Review record', 'FEAT-014', 'Missing']} />
            </tbody>
          </table>
        </Card>
      );
    case 'table':
      return (
        <Card>
          <div className={styles.previewStack}>
            <Table
              caption="Repository inventory"
              columns={[
                { key: 'name', label: 'Repository' },
                { key: 'branch', label: 'Branch' },
                { key: 'state', label: 'State' },
              ]}
              rows={[
                { name: 'forge-core', branch: 'main', state: 'Observed' },
                { name: 'docs-site', branch: 'Unavailable', state: 'Stale' },
              ]}
            />
            <Table
              caption="Empty repository inventory"
              columns={[{ key: 'name', label: 'Repository' }]}
              rows={[]}
              emptyMessage="No repositories available."
            />
          </div>
        </Card>
      );
    case 'code-label':
      return (
        <Card>
          <div className={styles.previewRow}>
            <CodeLabel>FEAT-012</CodeLabel>
            <CodeLabel>8f1c6a2d</CodeLabel>
          </div>
        </Card>
      );
    default:
      return null;
  }
}
