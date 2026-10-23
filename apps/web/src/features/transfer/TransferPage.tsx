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
    fileName,
    importedProjectId,
    importProject,
    preview,
    previewImport,
    selectSourceFile,
    updateDocumentText,
  } = useTransferController(workspaceId, projectId);
  const currentStep = importedProjectId ? 3 : preview ? 2 : 1;

  return (
    <div className={styles.stack}>
      <SectionHeader title="Project transfer" eyebrow="FORGE / Planning-only transfer" />
      <p>
        Import and export use the versioned project document. Review the fingerprint before import;
        only planning records are transferred. Evidence, verification and release records are
        excluded.
      </p>
      {error && <p role="alert">{error}</p>}

      <ol className={styles.steps} aria-label="Transfer steps">
        {['Select source', 'Review planning', 'Confirm'].map((step, index) => (
          <li key={step} aria-current={currentStep === index + 1 ? 'step' : undefined}>
            <span aria-hidden="true">0{index + 1}</span> {step}
          </li>
        ))}
      </ol>

      <div className={styles.workflowGrid}>
        <Card>
          <section aria-labelledby="import-title" className={styles.panel}>
            <h3 id="import-title">Import a project</h3>
            <p>
              Import versioned project JSON. Existing `forge-project-import-v1` files remain
              supported.
            </p>
            <FormField label="Choose a project JSON file">
              <input
                className={styles.fileInput}
                type="file"
                accept="application/json,.json"
                aria-label="Choose a project JSON file"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) void selectSourceFile(file);
                }}
              />
            </FormField>
            {fileName && <p className={styles.fileName}>Selected source: {fileName}</p>}
            <details className={styles.advanced}>
              <summary>Advanced JSON paste</summary>
              <FormField label="Advanced JSON document">
                <Textarea
                  id="transfer-document"
                  value={documentText}
                  onChange={(event) => updateDocumentText(event.target.value)}
                  placeholder="Paste a versioned project transfer document"
                  rows={10}
                />
              </FormField>
            </details>
            <div className={styles.actions}>
              <Button
                type="button"
                onClick={() => void previewImport()}
                disabled={!documentText.trim()}
              >
                Review import
              </Button>
            </div>
          </section>
        </Card>

        <Card>
          <section aria-labelledby="export-title" className={styles.panel}>
            <h3 id="export-title">Export current project</h3>
            <p>Review and download the versioned planning document. Export does not change data.</p>
            <Button type="button" onClick={() => void exportProject()}>
              Download project export
            </Button>
            {exported && (
              <div className={styles.review} role="status">
                <h4>Export ready</h4>
                <StatusChip tone="success">forge-project-transfer-v2</StatusChip>
                <p>JSON download prepared from the selected project.</p>
                {documentText && (
                  <details>
                    <summary>Review exported contents</summary>
                    <pre className={styles.documentPreview}>{documentText}</pre>
                  </details>
                )}
              </div>
            )}
          </section>
        </Card>
      </div>

      {preview && (
        <Card>
          <section aria-labelledby="review-title" className={styles.panel}>
            <h3 id="review-title">Review planning changes</h3>
            <StatusChip tone="warning">FINGERPRINT_REQUIRED</StatusChip>
            <p>Project to create: {preview.project.name}</p>
            <p className={styles.fingerprint}>
              Fingerprint: <code>{preview.fingerprint}</code>
            </p>
            <h4>Validated planning records</h4>
            <ul>
              {Object.entries(preview.counts).map(([key, count]) => (
                <li key={key}>
                  {key.replaceAll('_', ' ')}: {String(count)}
                </li>
              ))}
            </ul>
            <p>
              Only the reviewed fingerprint can be committed. Operational evidence and delivery
              state are not imported.
            </p>
            <Button type="button" onClick={() => void importProject()}>
              Confirm planning import
            </Button>
          </section>
        </Card>
      )}

      {importedProjectId && (
        <Card>
          <section aria-labelledby="import-success-title" className={styles.panel}>
            <h3 id="import-success-title">Import complete</h3>
            <StatusChip tone="success">IMPORTED_PLANNING_ONLY</StatusChip>
            <p>Created project: {importedProjectId}</p>
          </section>
        </Card>
      )}
    </div>
  );
}
