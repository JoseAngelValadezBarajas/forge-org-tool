import { useEffect, useRef, useState } from 'react';
import { useIsMobile } from '../../platform/useIsMobile';
import { useParams } from 'react-router-dom';
import { organizationApi, type EpicStatus, type WorkspaceTag } from '@forge-org/api-client';
import { usePlanningController } from './usePlanningController';
import { usePointerKanbanDrag } from './usePointerKanbanDrag';
import { PLANNING_COLUMN_STATUSES } from './components';

export function usePlanningPage() {
  const { workspaceId = '', projectId = '' } = useParams();
  const [workspaceTags, setWorkspaceTags] = useState<WorkspaceTag[]>([]);
  const [tagCatalogError, setTagCatalogError] = useState('');
  const [epicDialogOpen, setEpicDialogOpen] = useState(false);
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [mobileEpicStatus, setMobileEpicStatus] = useState('all');
  const [epicSearch, setEpicSearch] = useState('');
  const [epicStatusFilter, setEpicStatusFilter] = useState('all');
  const [epicPriorityFilter, setEpicPriorityFilter] = useState('all');
  const [epicTagFilter, setEpicTagFilter] = useState('');
  const isMobile = useIsMobile();
  const epicCreateErrorAtSubmit = useRef<string | null>(null);
  const featureCreateErrorAtSubmit = useRef<string | null>(null);
  const epicTriggerRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    let current = true;
    void organizationApi.listWorkspaceTags(workspaceId).then(
      (tags) => current && Array.isArray(tags) && setWorkspaceTags(tags),
      () => current && setTagCatalogError('Workspace tags could not be loaded.'),
    );
    return () => {
      current = false;
    };
  }, [workspaceId]);
  const controller = usePlanningController(workspaceId, projectId);
  const { error, featureTitle, overview, title, updateEpic } = controller;
  useEffect(() => {
    if (epicCreateErrorAtSubmit.current === null) return;
    if (error && error !== epicCreateErrorAtSubmit.current) {
      epicCreateErrorAtSubmit.current = null;
      return;
    }
    if (!title) {
      const timeout = window.setTimeout(() => {
        epicCreateErrorAtSubmit.current = null;
        setEpicDialogOpen(false);
      }, 0);
      return () => window.clearTimeout(timeout);
    }
  }, [error, title]);
  useEffect(() => {
    if (featureCreateErrorAtSubmit.current === null) return;
    if (error && error !== featureCreateErrorAtSubmit.current) {
      featureCreateErrorAtSubmit.current = null;
      return;
    }
    if (!featureTitle) {
      const timeout = window.setTimeout(() => {
        featureCreateErrorAtSubmit.current = null;
        setFeatureDialogOpen(false);
      }, 0);
      return () => window.clearTimeout(timeout);
    }
  }, [error, featureTitle]);
  useEffect(() => {
    if (!epicDialogOpen) epicTriggerRef.current?.focus();
  }, [epicDialogOpen]);
  const archivedEpics = overview.epics.filter((epic) => Boolean(epic.archived_at));
  const workflowEpics = overview.epics.filter(
    (epic) =>
      !epic.archived_at && PLANNING_COLUMN_STATUSES.some((column) => column.value === epic.status),
  );
  const legacyEpics = overview.epics.filter(
    (epic) =>
      !epic.archived_at && !PLANNING_COLUMN_STATUSES.some((column) => column.value === epic.status),
  );
  const filteredWorkflowEpics = workflowEpics.filter((epic) => {
    const query = epicSearch.trim().toLowerCase();
    return (
      (!query || epic.title.toLowerCase().includes(query)) &&
      (epicStatusFilter === 'all' || epic.status === epicStatusFilter) &&
      (epicPriorityFilter === 'all' || epic.priority === epicPriorityFilter) &&
      (!epicTagFilter || epic.tags?.includes(epicTagFilter))
    );
  });
  const epicPointerDrag = usePointerKanbanDrag<EpicStatus>({
    onDrop: (id, destination) => {
      const epic = workflowEpics.find((item) => item.id === id);
      if (epic && epic.status !== destination) void updateEpic(epic, destination);
    },
  });
  function rememberFeatureCreateError() {
    featureCreateErrorAtSubmit.current = error;
  }
  function rememberEpicCreateError() {
    epicCreateErrorAtSubmit.current = error;
  }

  return {
    ...controller,
    workspaceId,
    projectId,
    workspaceTags,
    tagCatalogError,
    epicDialogOpen,
    setEpicDialogOpen,
    featureDialogOpen,
    setFeatureDialogOpen,
    mobileEpicStatus,
    setMobileEpicStatus,
    epicSearch,
    setEpicSearch,
    epicStatusFilter,
    setEpicStatusFilter,
    epicPriorityFilter,
    setEpicPriorityFilter,
    epicTagFilter,
    setEpicTagFilter,
    isMobile,
    rememberEpicCreateError,
    rememberFeatureCreateError,
    epicTriggerRef,
    archivedEpics,
    workflowEpics,
    legacyEpics,
    filteredWorkflowEpics,
    epicPointerDrag,
  };
}
