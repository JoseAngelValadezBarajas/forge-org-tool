import { useState } from 'react';
import { organizationApi } from '@forge-org/api-client';

export type TransferPreview = {
  schema_version: string;
  fingerprint: string;
  project: { name: string };
  counts: Record<string, number>;
};

export function useTransferController(workspaceId: string, projectId: string) {
  const [documentText, setDocumentText] = useState('');
  const [preview, setPreview] = useState<TransferPreview | null>(null);
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
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to export project.');
    }
  }

  async function previewImport() {
    try {
      const document = JSON.parse(documentText) as unknown;
      setPreview(await organizationApi.previewProjectImport(workspaceId, document));
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to preview project import.');
    }
  }

  async function importProject() {
    if (!preview) return;
    try {
      const document = JSON.parse(documentText) as unknown;
      const result = await organizationApi.importProject(
        workspaceId,
        document,
        preview.fingerprint,
      );
      setImportedProjectId(result.project_id);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to import project.');
    }
  }

  function updateDocumentText(value: string) {
    setDocumentText(value);
    setExported(false);
    setImportedProjectId('');
  }

  return {
    documentText,
    error,
    exportProject,
    exported,
    importedProjectId,
    importProject,
    preview,
    previewImport,
    updateDocumentText,
  };
}
