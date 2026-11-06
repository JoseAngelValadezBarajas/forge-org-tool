import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { organizationApi, type ContextualTransferScope } from '@forge-org/api-client';
import { useTransferController } from './useTransferController';

export function useTransferPage({
  projectName,
  workspaceName,
}: {
  projectName?: string;
  workspaceName?: string;
}) {
  const { workspaceId = '', projectId = '', scope, destinationId } = useParams();
  const contextualScope = ['epics', 'work-items', 'tasks'].includes(scope ?? '')
    ? (scope as ContextualTransferScope)
    : undefined;
  const needsRecordName = contextualScope === 'work-items' || contextualScope === 'tasks';
  const destinationLookupKey = `${contextualScope}:${workspaceId}:${projectId}:${destinationId}`;
  const [destinationLookup, setDestinationLookup] = useState<{
    key: string;
    name?: string;
    failed: boolean;
  } | null>(null);
  const currentDestinationLookup =
    destinationLookup?.key === destinationLookupKey ? destinationLookup : null;
  const destinationRecordName = currentDestinationLookup?.name ?? '';
  const destinationLookupFailed = currentDestinationLookup?.failed ?? false;
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
    if (!needsRecordName || !workspaceId || !projectId || !destinationId) return;

    let current = true;
    void organizationApi
      .planningOverview(workspaceId, projectId)
      .then((overview) => {
        if (!current) return;
        const recordName =
          contextualScope === 'work-items'
            ? overview.epics.find((epic) => epic.id === destinationId)?.title
            : [
                ...overview.epics.flatMap((epic) => epic.features),
                ...overview.unassigned_features,
              ].find((feature) => feature.id === destinationId)?.title;
        setDestinationLookup({ key: destinationLookupKey, name: recordName, failed: !recordName });
      })
      .catch(() => {
        if (current) setDestinationLookup({ key: destinationLookupKey, failed: true });
      });
    return () => {
      current = false;
    };
  }, [
    contextualScope,
    needsRecordName,
    workspaceId,
    projectId,
    destinationId,
    destinationLookupKey,
  ]);

  const contextualTitle =
    contextualScope === 'epics'
      ? 'Import an Epic'
      : contextualScope === 'work-items'
        ? 'Import work items'
        : 'Import tasks';
  const destinationProjectName = projectName?.trim() || 'this project';
  const destinationName = needsRecordName ? destinationRecordName : destinationProjectName;
  const unavailableDestination = destinationLookupFailed
    ? 'unavailable destination'
    : 'Loading destination…';
  const destinationPath = [
    workspaceName?.trim(),
    projectName?.trim(),
    needsRecordName ? destinationName || unavailableDestination : undefined,
  ]
    .filter(Boolean)
    .join(' / ');
  const stepLabels = contextualScope
    ? ['Select source', 'Preview', 'Confirm']
    : ['Select source', 'Review planning', 'Confirm'];
  return {
    projectId,
    scope,
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
  };
}
