import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getConfiguredStorageProviders,
  getStorageSnapshot,
  inspectStorage,
  organizationApi,
  switchStorageProvider,
  type PlanningOverview,
  type Project,
  type StorageProvider,
  type StorageSnapshot,
  type Workspace,
} from '@forge-org/api-client';
import { useTheme } from '../theme';
import { getProjectContext } from './navigationContext';

const SIDEBAR_COLLAPSED_KEY = 'forge-sidebar-collapsed';

export function useApplicationShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(
    () => localStorage.getItem('forge-active-workspace') ?? '',
  );
  const activeWorkspaceIdRef = useRef(activeWorkspaceId);
  const [navigationError, setNavigationError] = useState('');
  const workspaceRevision = useRef(0);
  const context = getProjectContext(location.pathname);
  const contextWorkspaceId = context?.workspaceId;
  const contextProjectId = context?.projectId;
  const contextEpicId = context?.epicId;
  const contextFeatureId = context?.featureId;
  const routeWorkspaceId = context?.workspaceId;
  const navigationWorkspaceId = routeWorkspaceId ?? activeWorkspaceId;
  const activeWorkspace = workspaces.find((workspace) => workspace.id === navigationWorkspaceId);
  const [projectWorkspaceId, setProjectWorkspaceId] = useState('');
  const [projectRefresh, setProjectRefresh] = useState(0);
  const [projectsExpanded, setProjectsExpanded] = useState(true);
  const [projectSearchOpen, setProjectSearchOpen] = useState(false);
  const [projectQuery, setProjectQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true',
  );
  const [storageMenuOpen, setStorageMenuOpen] = useState(false);
  const [storageSnapshot, setStorageSnapshot] = useState<StorageSnapshot>(() =>
    getStorageSnapshot(),
  );
  const [configuredStorageProviders, setConfiguredStorageProviders] = useState<StorageProvider[]>(
    () => getConfiguredStorageProviders(),
  );
  const [storageRevision, setStorageRevision] = useState(0);
  const storageProviderRef = useRef(storageSnapshot.provider);
  const storageDataRevision = useRef(0);
  const storageMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const storageMenuItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const previousStorageMenuOpen = useRef(false);
  const [contextOverview, setContextOverview] = useState<PlanningOverview | null>(null);
  const workspaceFallbackName = navigationError
    ? 'Workspace unavailable'
    : storageSnapshot.provider === 'supabase'
      ? 'No Supabase workspace'
      : 'Local Workspace';
  useEffect(() => {
    activeWorkspaceIdRef.current = activeWorkspaceId;
  }, [activeWorkspaceId]);
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);
  useEffect(() => {
    function onStorageChanged() {
      const nextSnapshot = getStorageSnapshot();
      const providerChanged = storageProviderRef.current !== nextSnapshot.provider;
      storageProviderRef.current = nextSnapshot.provider;
      storageDataRevision.current += 1;
      setStorageSnapshot(nextSnapshot);
      setConfiguredStorageProviders(getConfiguredStorageProviders());
      setStorageRevision((value) => value + 1);
      setProjectRefresh((value) => value + 1);
      setWorkspaces([]);
      setProjects([]);
      setProjectWorkspaceId('');
      setContextOverview(null);
      setNavigationError('');
      if (providerChanged) {
        workspaceRevision.current += 1;
        setActiveWorkspaceId('');
        activeWorkspaceIdRef.current = '';
        localStorage.removeItem('forge-active-workspace');
      }
    }
    window.addEventListener('forge:storage-changed', onStorageChanged);
    return () => window.removeEventListener('forge:storage-changed', onStorageChanged);
  }, []);
  useEffect(() => {
    if (storageMenuOpen) {
      storageMenuItemRefs.current[0]?.focus();
    } else if (previousStorageMenuOpen.current) {
      storageMenuTriggerRef.current?.focus();
    }
    previousStorageMenuOpen.current = storageMenuOpen;
  }, [storageMenuOpen]);
  useEffect(() => {
    if (storageSnapshot.provider !== 'supabase') return;
    let current = true;
    void inspectStorage().catch((cause: unknown) => {
      if (current) {
        setNavigationError(cause instanceof Error ? cause.message : 'Supabase unavailable.');
      }
    });
    return () => {
      current = false;
    };
  }, [storageSnapshot.provider]);
  useEffect(() => {
    let current = true;
    const initialRevision = workspaceRevision.current;
    const initialStorageDataRevision = storageDataRevision.current;
    void organizationApi
      .listWorkspaces()
      .then((items) => {
        if (!current) return;
        if (storageDataRevision.current !== initialStorageDataRevision) return;
        if (workspaceRevision.current !== initialRevision) {
          return;
        }
        setWorkspaces(items);
        const saved = localStorage.getItem('forge-active-workspace') ?? '';
        const selected = items.some((item) => item.id === saved) ? saved : (items[0]?.id ?? '');
        setActiveWorkspaceId(selected);
        if (selected) localStorage.setItem('forge-active-workspace', selected);
        else localStorage.removeItem('forge-active-workspace');
      })
      .catch((cause: unknown) => {
        if (current && storageDataRevision.current === initialStorageDataRevision)
          setNavigationError(
            cause instanceof Error ? cause.message : 'Workspace navigation unavailable.',
          );
      });
    return () => {
      current = false;
    };
  }, [storageRevision]);
  useEffect(() => {
    function onActiveWorkspaceChange(event: Event) {
      const id = (event as CustomEvent<{ workspaceId?: string }>).detail?.workspaceId;
      if (!id) return;
      workspaceRevision.current += 1;
      setActiveWorkspaceId(id);
      activeWorkspaceIdRef.current = id;
      localStorage.setItem('forge-active-workspace', id);
    }
    function onWorkspaceCreated(event: Event) {
      const workspace = (event as CustomEvent<{ workspace?: Workspace }>).detail?.workspace;
      if (workspace) {
        workspaceRevision.current += 1;
        setWorkspaces((items) => [...items.filter((item) => item.id !== workspace.id), workspace]);
      }
    }
    function onWorkspaceUpdated(event: Event) {
      const workspace = (event as CustomEvent<{ workspace?: Workspace }>).detail?.workspace;
      if (workspace) {
        workspaceRevision.current += 1;
        setWorkspaces((items) =>
          items.map((item) => (item.id === workspace.id ? workspace : item)),
        );
      }
    }
    function onWorkspaceDeleted(event: Event) {
      const id = (event as CustomEvent<{ workspaceId?: string }>).detail?.workspaceId;
      if (!id) return;
      workspaceRevision.current += 1;
      setWorkspaces((items) => items.filter((item) => item.id !== id));
      setProjects((items) => items.filter((item) => item.workspace_id !== id));
      if (activeWorkspaceIdRef.current === id) {
        setActiveWorkspaceId('');
        localStorage.removeItem('forge-active-workspace');
        setProjectWorkspaceId('');
      }
    }
    function onProjectsChanged() {
      setProjectRefresh((value) => value + 1);
    }
    window.addEventListener('forge:active-workspace-change', onActiveWorkspaceChange);
    window.addEventListener('forge:workspace-created', onWorkspaceCreated);
    window.addEventListener('forge:workspace-updated', onWorkspaceUpdated);
    window.addEventListener('forge:workspace-deleted', onWorkspaceDeleted);
    window.addEventListener('forge:projects-changed', onProjectsChanged);
    return () => {
      window.removeEventListener('forge:active-workspace-change', onActiveWorkspaceChange);
      window.removeEventListener('forge:workspace-created', onWorkspaceCreated);
      window.removeEventListener('forge:workspace-updated', onWorkspaceUpdated);
      window.removeEventListener('forge:workspace-deleted', onWorkspaceDeleted);
      window.removeEventListener('forge:projects-changed', onProjectsChanged);
    };
  }, []);
  useEffect(() => {
    if (routeWorkspaceId && workspaces.some((workspace) => workspace.id === routeWorkspaceId)) {
      localStorage.setItem('forge-active-workspace', routeWorkspaceId);
    }
  }, [routeWorkspaceId, workspaces]);
  useEffect(() => {
    let current = true;
    if (!navigationWorkspaceId)
      return () => {
        current = false;
      };
    void organizationApi
      .listProjects(navigationWorkspaceId, '', 'active')
      .then((items) => {
        if (current) {
          setProjects(items);
          setProjectWorkspaceId(navigationWorkspaceId);
        }
      })
      .catch((cause: unknown) => {
        if (current) {
          setProjectWorkspaceId(navigationWorkspaceId);
          setNavigationError(cause instanceof Error ? cause.message : 'Projects unavailable.');
        }
      });
    return () => {
      current = false;
    };
  }, [navigationWorkspaceId, projectRefresh]);
  useEffect(() => {
    if (!contextEpicId && !contextFeatureId) return;
    let current = true;
    void organizationApi
      .planningOverview(contextWorkspaceId!, contextProjectId!)
      .then((overview) => {
        if (current) setContextOverview(overview);
      })
      .catch(() => {
        if (current) setContextOverview(null);
      });
    return () => {
      current = false;
    };
  }, [contextEpicId, contextFeatureId, contextProjectId, contextWorkspaceId]);
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if (event.key === 'Escape') {
        setPaletteOpen(false);
        setStorageMenuOpen(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  function registerStorageMenuItem(index: number, node: HTMLButtonElement | null) {
    storageMenuItemRefs.current[index] = node;
  }

  function go(path: string) {
    setPaletteOpen(false);
    setStorageMenuOpen(false);
    navigate(path);
  }

  function selectStorageProvider(provider: StorageProvider) {
    try {
      const nextSnapshot = switchStorageProvider(provider);
      setStorageSnapshot(nextSnapshot);
      setConfiguredStorageProviders(getConfiguredStorageProviders());
      setStorageMenuOpen(false);
      if (nextSnapshot.status === 'authentication_required') navigate('/settings/storage');
    } catch {
      setStorageMenuOpen(false);
      navigate('/settings/storage');
    }
  }

  function handleStorageMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const items = storageMenuItemRefs.current.filter(
      (item): item is HTMLButtonElement => item !== null,
    );
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      setStorageMenuOpen(false);
      return;
    }
    if (!items.length || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : (currentIndex + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[nextIndex]?.focus();
  }
  function selectWorkspace(id: string) {
    setActiveWorkspaceId(id);
    activeWorkspaceIdRef.current = id;
    localStorage.setItem('forge-active-workspace', id);
    window.dispatchEvent(
      new CustomEvent('forge:active-workspace-change', { detail: { workspaceId: id } }),
    );
    navigate('/');
  }
  const isMobileEpicBoard = /^\/planning\/[^/]+\/[^/]+\/epics\/[^/]+(?:\/|$)/.test(
    location.pathname,
  );
  const activeProject = context
    ? projects.find((project) => project.id === context.projectId)
    : null;
  const activeEpic =
    contextEpicId || contextFeatureId
      ? contextOverview?.epics.find(
          (epic) =>
            epic.id === contextEpicId ||
            epic.features.some((feature: { id: string }) => feature.id === contextFeatureId),
        )
      : undefined;
  const isPlanningContext = location.pathname.startsWith('/planning/');
  const isFeatureContext = Boolean(context?.featureId);
  const isEpicContext = Boolean(context?.epicId);
  const currentContextLabel = isFeatureContext
    ? 'WORK ITEM'
    : isEpicContext
      ? (activeEpic?.title ?? 'EPIC')
      : isPlanningContext
        ? 'EPICS'
        : 'OVERVIEW';
  const orderedProjects = [...projects].sort(
    (left, right) =>
      Number(right.id === context?.projectId) - Number(left.id === context?.projectId),
  );
  const filteredProjects = orderedProjects.filter((project) =>
    project.name.toLocaleLowerCase().includes(projectQuery.trim().toLocaleLowerCase()),
  );
  const mobileWorkspaceId = navigationWorkspaceId || activeWorkspaceId;
  const mobileBoardPath = context
    ? `/planning/${context.workspaceId}/${context.projectId}`
    : projectWorkspaceId === mobileWorkspaceId && projects[0]
      ? `/planning/${mobileWorkspaceId}/${projects[0].id}`
      : undefined;
  const productDestinations = [
    {
      id: 'overview',
      label: 'Overview',
      path: context ? `/projects/${context.workspaceId}/${context.projectId}` : '/',
    },
    { id: 'projects', label: 'Projects', path: '/' },
    {
      id: 'planning',
      label: 'Planning',
      path: context && `/planning/${context.workspaceId}/${context.projectId}`,
    },
    {
      id: 'transfer',
      label: 'Transfer',
      path: context && `/transfer/${context.workspaceId}/${context.projectId}`,
    },
  ];
  return {
    paletteOpen,
    setPaletteOpen,
    workspaces,
    projects,
    navigationError,
    projectWorkspaceId,
    projectsExpanded,
    setProjectsExpanded,
    projectSearchOpen,
    setProjectSearchOpen,
    projectQuery,
    setProjectQuery,
    sidebarCollapsed,
    setSidebarCollapsed,
    storageMenuOpen,
    setStorageMenuOpen,
    storageSnapshot,
    configuredStorageProviders,
    storageRevision,
    location,
    context,
    navigationWorkspaceId,
    activeWorkspace,
    storageMenuTriggerRef,
    registerStorageMenuItem,
    workspaceFallbackName,
    isMobileEpicBoard,
    activeProject,
    activeEpic,
    isPlanningContext,
    isFeatureContext,
    isEpicContext,
    currentContextLabel,
    filteredProjects,
    mobileWorkspaceId,
    mobileBoardPath,
    productDestinations,
    theme,
    resolvedTheme,
    setTheme,
    go,
    selectStorageProvider,
    handleStorageMenuKeyDown,
    selectWorkspace,
  };
}
