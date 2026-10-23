import { useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { ContextualTransferScope } from '@forge-org/api-client';
import { Button, Card, FormField, SectionHeader, StatusChip, Textarea } from '@forge-org/ui';
import styles from './TransferPage.module.css';
import { useTransferController } from './useTransferController';

export function TransferPage() {
  const { workspaceId = '', projectId = '', scope, destinationId } = useParams();
  const navigate = useNavigate();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const contextualScope = ['epics', 'work-items', 'tasks'].includes(scope ?? '')
    ? (scope as ContextualTransferScope)
    : undefined;
  const returnPath = contextualScope
    ? contextualScope === 'epics'
      ? `/planning/${workspaceId}/${projectId}`
      : contextualScope === 'work-items'
        ? `/planning/${workspaceId}/${projectId}/epics/${destinationId}`
        : `/planning/${workspaceId}/${projectId}/features/${destinationId}`
    : projectId
      ? `/projects/${workspaceId}/${projectId}`
      : '/';
  const {
    documentText,
    error,
    exportProject,
    exportProjectPackage,
    exported,
    fileName,
    importedProjectId,
    importProject,
    packageBase64,
    preview,
    previewImport,
    selectSourceFile,
    updateDocumentText,
  } = useTransferController(workspaceId, projectId, contextualScope, destinationId);
  const currentStep = importedProjectId ? 3 : preview ? 2 : 1;
  const successPath = contextualScope
    ? returnPath
    : importedProjectId
      ? `/projects/${workspaceId}/${importedProjectId}`
      : returnPath;
  const successLinkLabel = contextualScope
    ? contextualScope === 'epics'
      ? 'Return to project board'
      : contextualScope === 'work-items'
        ? 'Return to Epic'
        : 'Return to work item'
    : 'Open project';

  useEffect(() => {
    if (contextualScope) closeButtonRef.current?.focus();
  }, [contextualScope]);

  function handleDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!contextualScope) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      navigate(returnPath);
      return;
    }
    if (event.key !== 'Tab') return;

    const dialog = event.currentTarget;
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter(
      (element) =>
        !element.closest('[hidden], [inert]') &&
        (!element.closest('details:not([open])') ||
          element.matches('details:not([open]) > summary')),
    );
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className={contextualScope ? styles.contextOverlay : undefined}>
      <div
        className={`${styles.stack} ${contextualScope ? styles.contextDialog : ''}`}
        role={contextualScope ? 'dialog' : undefined}
        aria-modal={contextualScope ? true : undefined}
        aria-label={contextualScope ? `Import and export ${contextualScope}` : undefined}
        tabIndex={contextualScope ? -1 : undefined}
        onKeyDown={contextualScope ? handleDialogKeyDown : undefined}
      >
        {contextualScope && (
          <div className={styles.dialogActions}>
            <Button
              ref={closeButtonRef}
              type="button"
              variant="secondary"
              onClick={() => navigate(returnPath)}
            >
              Close transfer
            </Button>
          </div>
        )}
        <SectionHeader
          title={
            contextualScope
              ? `Import / export ${contextualScope}`
              : projectId
                ? 'Project transfer'
                : 'Import project'
          }
          eyebrow="FORGE / Planning-only transfer"
        />
        {contextualScope && (
          <p className={styles.destination}>
            Destination: {contextualScope} ({destinationId})
          </p>
        )}
        <p>
          {contextualScope
            ? `Transfer versioned JSON for the selected ${contextualScope} destination. Review the destination and fingerprint before import.`
            : 'Import and export use versioned project JSON or a ZIP package that includes Bug screenshots.'}{' '}
          Operational evidence, verification and release records are excluded.
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
              <h3 id="import-title">
                {contextualScope ? `Import ${contextualScope}` : 'Import a project'}
              </h3>
              <p>
                {contextualScope
                  ? 'Choose a v2 JSON document or paste it below. Preview validates references before confirmation.'
                  : 'Import versioned project JSON or a v2 ZIP package with Bug screenshots. Existing `forge-project-import-v1` JSON files remain supported.'}
              </p>
              <FormField label="Choose a project transfer file">
                <input
                  className={styles.fileInput}
                  type="file"
                  accept={
                    contextualScope
                      ? 'application/json,.json'
                      : 'application/json,.json,application/zip,.zip'
                  }
                  aria-label="Choose a project transfer file"
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
                    placeholder={`Paste a versioned ${contextualScope ?? 'project'} transfer document`}
                    rows={10}
                  />
                </FormField>
              </details>
              <div className={styles.actions}>
                <Button
                  type="button"
                  onClick={() => void previewImport()}
                  disabled={!documentText.trim() && !packageBase64}
                >
                  Review import
                </Button>
              </div>
            </section>
          </Card>

          {projectId && (
            <Card>
              <section aria-labelledby="export-title" className={styles.panel}>
                <h3 id="export-title">
                  {contextualScope ? `Export ${contextualScope}` : 'Export current project'}
                </h3>
                <p>
                  Review and download the versioned planning document. Export does not change data.
                </p>
                {!(contextualScope === 'epics' && destinationId === projectId) && (
                  <Button type="button" onClick={() => void exportProject()}>
                    Download {contextualScope ?? 'project'} export (JSON)
                  </Button>
                )}
                {!contextualScope && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void exportProjectPackage()}
                  >
                    Download ZIP package with screenshots
                  </Button>
                )}
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
          )}
        </div>

        {preview && (
          <Card>
            <section aria-labelledby="review-title" className={styles.panel}>
              <h3 id="review-title">Review planning changes</h3>
              <StatusChip tone="warning">FINGERPRINT_REQUIRED</StatusChip>
              <p>
                {preview.destination
                  ? `Reviewed destination: ${preview.destination.scope} (${preview.destination.id})`
                  : `Project to create: ${preview.project.name}`}
              </p>
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
              <p>
                {contextualScope
                  ? `Imported into project: ${importedProjectId}`
                  : `Created project: ${importedProjectId}`}
              </p>
              <Link to={successPath}>{successLinkLabel}</Link>
            </section>
          </Card>
        )}
      </div>
    </div>
  );
}
