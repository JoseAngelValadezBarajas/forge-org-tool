import { useParams } from 'react-router-dom';
import { Button, Card, FormField, SectionHeader, StatusChip, Textarea } from '@forge-org/ui';
import styles from './TransferPage.module.css';
import { useTransferController } from './useTransferController';

export function TransferPage() {
  const { workspaceId = '', projectId = '' } = useParams();
  const {
    documentText,
    error,
    exportProject,
    exported,
    importedProjectId,
    importProject,
    preview,
    previewImport,
    updateDocumentText,
  } = useTransferController(workspaceId, projectId);

  return (
    <div className={styles.stack}>
      <SectionHeader title="Project transfer" eyebrow="FORGE / Planning-only transfer" />
      <p>
        Import and export use a reviewed fingerprint. Transfer contains planning records only; it
        never imports delivery truth.
      </p>
      {error && <p role="alert">{error}</p>}
      <Card>
        <div className={styles.actions}>
          <Button onClick={() => void exportProject()}>Export project</Button>
          <Button
            variant="secondary"
            onClick={() => void previewImport()}
            disabled={!documentText.trim()}
          >
            Preview import
          </Button>
          <Button variant="secondary" onClick={() => void importProject()} disabled={!preview}>
            Commit reviewed import
          </Button>
        </div>
      </Card>
      <Card>
        <FormField label="Versioned project document">
          <Textarea
            id="transfer-document"
            value={documentText}
            onChange={(event) => {
              updateDocumentText(event.target.value);
            }}
            placeholder="Paste a forge-project-import-v1 document"
            rows={16}
          />
        </FormField>
      </Card>
      {exported && (
        <Card>
          <h3>Export review</h3>
          <StatusChip tone="success">forge-project-import-v1</StatusChip>
          <p>Export is a planning document and has not changed project state.</p>
        </Card>
      )}
      {preview && (
        <Card>
          <h3>Reviewed import</h3>
          <StatusChip tone="warning">FINGERPRINT_REQUIRED</StatusChip>
          <p>{preview.project.name}</p>
          <p>Fingerprint: {preview.fingerprint}</p>
          <ul>
            {Object.entries(preview.counts).map(([key, count]) => (
              <li key={key}>
                {key}: {count}
              </li>
            ))}
          </ul>
        </Card>
      )}
      {importedProjectId && (
        <Card>
          <StatusChip tone="success">IMPORTED_PLANNING_ONLY</StatusChip>
          <p>Created project: {importedProjectId}</p>
        </Card>
      )}
    </div>
  );
}
