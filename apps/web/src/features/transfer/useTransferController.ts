import { useState } from 'react';
import { organizationApi, type ProjectTransferPreview } from '@forge-org/api-client';

function downloadProjectDocument(document: unknown) {
  const blob = new Blob([JSON.stringify(document, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = 'project-export.json';
  anchor.hidden = true;
  window.document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function useTransferController(workspaceId: string, projectId: string) {
  const [documentText, setDocumentText] = useState('');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<ProjectTransferPreview | null>(null);
  const [exported, setExported] = useState(false);
  const [importedProjectId, setImportedProjectId] = useState('');
  const [error, setError] = useState('');

  async function exportProject() {
    try {
      const document = await organizationApi.exportProject(workspaceId, projectId);
      const text = JSON.stringify(document, null, 2);
      downloadProjectDocument(document);
      setExported(true);
      setFileName('');
      setDocumentText(text);
      setPreview(null);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to export project.');
    }
  }

  async function selectSourceFile(file: File) {
    setPreview(null);
    setImportedProjectId('');
    setExported(false);
    setError('');
    try {
      setDocumentText(await file.text());
      setFileName(file.name);
    } catch (cause) {
      setDocumentText('');
      setFileName('');
      setError(cause instanceof Error ? cause.message : 'Unable to read the selected JSON file.');
    }
  }

  async function previewImport() {
    setPreview(null);
    setImportedProjectId('');
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
      setPreview(null);
      setError('');
    } catch (cause) {
      setPreview(null);
      setError(cause instanceof Error ? cause.message : 'Unable to import project.');
    }
  }

  function updateDocumentText(value: string) {
    setDocumentText(value);
    setFileName(value.trim() ? 'Advanced JSON paste' : '');
    setPreview(null);
    setImportedProjectId('');
    setExported(false);
    setError('');
  }

  return {
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
  };
}
