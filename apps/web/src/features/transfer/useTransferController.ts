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

function downloadProjectPackage(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = 'forge-project-transfer-v2.zip';
  anchor.hidden = true;
  window.document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return window.btoa(binary);
}

export function useTransferController(workspaceId: string, projectId: string) {
  const [documentText, setDocumentText] = useState('');
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<ProjectTransferPreview | null>(null);
  const [exported, setExported] = useState(false);
  const [importedProjectId, setImportedProjectId] = useState('');
  const [error, setError] = useState('');
  const [packageBase64, setPackageBase64] = useState<string | null>(null);

  async function exportProject() {
    try {
      const document = await organizationApi.exportProject(
        workspaceId,
        projectId,
        'forge-project-transfer-v2',
      );
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

  async function exportProjectPackage() {
    try {
      const blob = await organizationApi.exportProjectPackage(workspaceId, projectId);
      downloadProjectPackage(blob);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to export project package.');
    }
  }

  async function selectSourceFile(file: File) {
    setPreview(null);
    setImportedProjectId('');
    setExported(false);
    setError('');
    setPackageBase64(null);
    try {
      if (file.name.toLowerCase().endsWith('.zip')) {
        if (file.size > 5 * 1024 * 1024) throw new Error('Project packages are limited to 5 MiB.');
        setPackageBase64(toBase64(new Uint8Array(await file.arrayBuffer())));
        setDocumentText('');
        setFileName(file.name);
        return;
      }
      setPackageBase64(null);
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
      if (packageBase64) {
        setPreview(await organizationApi.previewProjectPackageImport(workspaceId, packageBase64));
        setError('');
        return;
      }
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
      if (packageBase64) {
        const result = await organizationApi.importProjectPackage(
          workspaceId,
          packageBase64,
          preview.fingerprint,
        );
        setImportedProjectId(result.project_id);
        setPreview(null);
        setError('');
        return;
      }
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
    setPackageBase64(null);
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
  };
}
