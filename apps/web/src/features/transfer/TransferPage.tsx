import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card, SectionHeader, StatusChip } from '@forge-org/ui';
import { organizationApi } from '@forge-org/api-client';
import styles from './TransferPage.module.css';

type Preview = { schema_version: string; fingerprint: string; project: { name: string }; counts: Record<string, number> };

export function TransferPage() {
  const { workspaceId = '', projectId = '' } = useParams();
  const [documentText, setDocumentText] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [exported, setExported] = useState(false);
  const [importedProjectId, setImportedProjectId] = useState('');
  const [error, setError] = useState('');

  async function exportProject() {
    try {
      const document = await organizationApi.exportProject(workspaceId, projectId);
      setExported(true);
      setDocumentText(JSON.stringify(document, null, 2));
      setPreview(null);
      setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to export project.'); }
  }

  async function previewImport() {
    try {
      const document = JSON.parse(documentText) as unknown;
      setPreview(await organizationApi.previewProjectImport(workspaceId, document));
      setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to preview project import.'); }
  }

  async function importProject() {
    if (!preview) return;
    try {
      const document = JSON.parse(documentText) as unknown;
      const result = await organizationApi.importProject(workspaceId, document, preview.fingerprint);
      setImportedProjectId(result.project_id);
      setError('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to import project.'); }
  }

  return <div className={styles.stack}>
    <SectionHeader title="Project transfer" eyebrow="FORGE / Planning-only transfer" />
    <p>Import and export use a reviewed fingerprint. Transfer contains planning records only; it never imports delivery truth.</p>
    {error && <p role="alert">{error}</p>}
    <Card><div className={styles.actions}><Button onClick={() => void exportProject()}>Export project</Button><Button variant="secondary" onClick={() => void previewImport()} disabled={!documentText.trim()}>Preview import</Button><Button variant="secondary" onClick={() => void importProject()} disabled={!preview}>Commit reviewed import</Button></div></Card>
    <Card><label htmlFor="transfer-document">Versioned project document</label><textarea id="transfer-document" value={documentText} onChange={(event) => { setDocumentText(event.target.value); setExported(false); setImportedProjectId(''); }} placeholder="Paste a forge-project-import-v1 document" rows={16} /></Card>
    {exported && <Card><h3>Export review</h3><StatusChip tone="success">forge-project-import-v1</StatusChip><p>Export is a planning document and has not changed project state.</p></Card>}
    {preview && <Card><h3>Reviewed import</h3><StatusChip tone="warning">FINGERPRINT_REQUIRED</StatusChip><p>{preview.project.name}</p><p>Fingerprint: {preview.fingerprint}</p><ul>{Object.entries(preview.counts).map(([key, count]) => <li key={key}>{key}: {count}</li>)}</ul></Card>}
    {importedProjectId && <Card><StatusChip tone="success">IMPORTED_PLANNING_ONLY</StatusChip><p>Created project: {importedProjectId}</p></Card>}
  </div>;
}
