import { Link } from 'react-router-dom';
import {
  AlertV2,
  BadgeV2,
  ButtonV2,
  CardV2,
  FilePicker,
  FormField,
  SectionHeader,
  Textarea,
} from '@corefoundry-labs/forge-ui';
import styles from './TransferPage.module.css';
import { useTransferPage } from './useTransferPage';

export function TransferPage({
  projectName,
  workspaceName,
}: {
  projectName?: string;
  workspaceName?: string;
}) {
  const {
    projectId,
    destinationId,
    contextualScope,
    needsRecordName,
    destinationRecordName,
    destinationLookupFailed,
    returnPath,
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
    currentStep,
    successPath,
    successLinkLabel,
    contextualTitle,
    destinationProjectName,
    destinationName,
    unavailableDestination,
    destinationPath,
    stepLabels,
  } = useTransferPage({
    projectName,
    workspaceName,
  });

  const contextualPreviewPanel = contextualScope ? (
    <CardV2 className={styles.contextCard}>
      <section
        aria-labelledby="context-preview-title"
        className={`${styles.panel} ${styles.previewPanel}`}
      >
        <h3 id="context-preview-title">Preview · {destinationName || unavailableDestination}</h3>
        {preview ? (
          <>
            <BadgeV2 tone="success">Validated manifest · {preview.schema_version}</BadgeV2>
            <div className={styles.previewCounts}>
              {Object.entries(preview.counts).map(([key, count]) => (
                <div className={styles.previewCount} key={key}>
                  <span>{key.replaceAll('_', ' ')}</span>
                  <strong>{String(count)}</strong>
                </div>
              ))}
            </div>
            <p className={styles.previewNotes}>CREATE NEW · IDs remapped · duplicate tags reused</p>
            <ButtonV2 type="button" onClick={() => void importProject()}>
              Confirm Import
            </ButtonV2>
            <details className={styles.safeguards}>
              <summary>Import safeguards</summary>
              <BadgeV2 tone="warning">FINGERPRINT_REQUIRED</BadgeV2>
              <p className={styles.fingerprint}>
                Fingerprint: <code>{preview.fingerprint}</code>
              </p>
              <p>Only this reviewed fingerprint can be committed. Import is atomic.</p>
            </details>
          </>
        ) : (
          <p className={styles.previewEmpty}>Choose a source to see a validated preview.</p>
        )}
      </section>
    </CardV2>
  ) : null;

  return (
    <div className={`${styles.stack} ${contextualScope ? styles.contextStack : ''}`}>
      {contextualScope ? (
        <header className={styles.contextHeading}>
          <span>CONTEXTUAL TRANSFER</span>
          <h1>{contextualTitle}</h1>
          <p>Review the content before it becomes part of your project.</p>
        </header>
      ) : (
        <SectionHeader
          title={projectId ? 'Project transfer' : 'Import project'}
          eyebrow="FORGE / Planning-only transfer"
        />
      )}
      {destinationLookupFailed && needsRecordName && (
        <AlertV2 tone="error">
          The import destination could not be verified. Return to the project board and try again.
        </AlertV2>
      )}
      {!contextualScope && (
        <p>
          Import and export use versioned project JSON or a ZIP package that includes Bug
          screenshots. Operational evidence, verification and release records are excluded.
        </p>
      )}
      {error && <AlertV2 tone="error">{error}</AlertV2>}

      <ol className={styles.steps} aria-label="Transfer steps">
        {stepLabels.map((step, index) => (
          <li key={step} aria-current={currentStep === index + 1 ? 'step' : undefined}>
            <span aria-hidden="true">0{index + 1}</span> {step}
          </li>
        ))}
      </ol>

      <div
        className={`${styles.workflowGrid} ${contextualScope ? styles.contextWorkflowGrid : ''}`}
      >
        <CardV2 className={contextualScope ? styles.contextCard : undefined}>
          <section
            aria-labelledby={contextualScope ? undefined : 'import-title'}
            className={styles.panel}
            aria-label={contextualScope ? 'Import source' : undefined}
          >
            <h3 id="import-title">
              {contextualScope
                ? `Import into ${destinationName || unavailableDestination}`
                : 'Import a project'}
            </h3>
            <p>
              {contextualScope
                ? 'Supported: Epic, Story, Bug or Task JSON. Preview checks references before confirmation.'
                : 'Import versioned project JSON or a v2 ZIP package with Bug screenshots. Existing `forge-project-import-v1` JSON files remain supported.'}
            </p>
            {contextualScope && (
              <div className={styles.destination} aria-label="Import destination">
                <span>Destination</span>
                <strong>{destinationPath || destinationProjectName}</strong>
              </div>
            )}
            <FilePicker
              accept={
                contextualScope
                  ? 'application/json,.json'
                  : 'application/json,.json,application/zip,.zip'
              }
              aria-label="Choose a project transfer file"
              className={contextualScope ? styles.contextFilePicker : undefined}
              title={contextualScope ? 'Drop a .json file here' : 'Choose a .json or .zip file'}
              description={contextualScope ? 'or browse your computer' : 'Browse for a local file.'}
              state={fileName ? 'selected' : 'empty'}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) void selectSourceFile(file);
              }}
            />
            {fileName && (!contextualScope || !preview) && (
              <p className={styles.fileName}>Selected source: {fileName}</p>
            )}
            {(!contextualScope || !preview) && (
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
            )}
            <div className={styles.actions}>
              <ButtonV2
                className={contextualScope ? styles.contextReviewAction : undefined}
                type="button"
                onClick={() => void previewImport()}
                disabled={
                  (!documentText.trim() && !packageBase64) ||
                  (needsRecordName && (!destinationRecordName || destinationLookupFailed))
                }
              >
                Review import
              </ButtonV2>
            </div>
            {contextualScope && projectId && !preview && (
              <details className={styles.exportDetails}>
                <summary>Export existing {contextualScope}</summary>
                {!(contextualScope === 'epics' && destinationId === projectId) && (
                  <ButtonV2 type="button" variant="secondary" onClick={() => void exportProject()}>
                    Download {contextualScope} export (JSON)
                  </ButtonV2>
                )}
                {exported && (
                  <div className={styles.review} role="status">
                    <h4>Export ready</h4>
                    <BadgeV2 tone="success">forge-project-transfer-v2</BadgeV2>
                    <p>Download prepared from the selected destination.</p>
                  </div>
                )}
              </details>
            )}
            {contextualScope && (
              <Link className={styles.returnLink} to={returnPath}>
                <span aria-hidden="true">←</span>{' '}
                {contextualScope === 'epics'
                  ? 'Back to Project'
                  : contextualScope === 'work-items'
                    ? 'Back to Epic'
                    : 'Back to Work Item'}
              </Link>
            )}
          </section>
        </CardV2>

        {!contextualScope && projectId && (
          <CardV2>
            <section aria-labelledby="export-title" className={styles.panel}>
              <h3 id="export-title">
                {contextualScope ? `Export ${contextualScope}` : 'Export current project'}
              </h3>
              <p>
                Review and download the versioned planning document. Export does not change data.
              </p>
              {!(contextualScope === 'epics' && destinationId === projectId) && (
                <ButtonV2 type="button" onClick={() => void exportProject()}>
                  Download {contextualScope ?? 'project'} export (JSON)
                </ButtonV2>
              )}
              {!contextualScope && (
                <ButtonV2
                  type="button"
                  variant="secondary"
                  onClick={() => void exportProjectPackage()}
                >
                  Download ZIP package with screenshots
                </ButtonV2>
              )}
              {exported && (
                <div className={styles.review} role="status">
                  <h4>Export ready</h4>
                  <BadgeV2 tone="success">forge-project-transfer-v2</BadgeV2>
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
          </CardV2>
        )}
        {contextualPreviewPanel}
      </div>

      {!contextualScope && preview && (
        <CardV2>
          <section aria-labelledby="review-title" className={styles.panel}>
            <h3 id="review-title">Review planning changes</h3>
            <BadgeV2 tone="warning">FINGERPRINT_REQUIRED</BadgeV2>
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
            <ButtonV2 type="button" onClick={() => void importProject()}>
              Confirm planning import
            </ButtonV2>
          </section>
        </CardV2>
      )}

      {importedProjectId && (
        <CardV2>
          <section aria-labelledby="import-success-title" className={styles.panel}>
            <h3 id="import-success-title">Import complete</h3>
            <BadgeV2 tone="success">IMPORTED_PLANNING_ONLY</BadgeV2>
            <p>
              {contextualScope
                ? `Imported into project: ${importedProjectId}`
                : `Created project: ${importedProjectId}`}
            </p>
            <Link to={successPath}>{successLinkLabel}</Link>
          </section>
        </CardV2>
      )}
    </div>
  );
}
