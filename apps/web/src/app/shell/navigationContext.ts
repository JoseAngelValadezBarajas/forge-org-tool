import type { StorageSnapshot } from '@forge-org/api-client';

export function storageProviderLabel(snapshot: StorageSnapshot): string {
  if (snapshot.provider === 'local') return 'Local DB';
  if (snapshot.status === 'ready') return 'Provider Supabase - Online';
  if (snapshot.status === 'authentication_required') return 'Provider Supabase - Sign in required';
  if (snapshot.status === 'schema_missing') return 'Provider Supabase - Schema required';
  if (snapshot.status === 'permissions_denied') return 'Provider Supabase - Access denied';
  if (snapshot.status === 'network_unavailable') return 'Provider Supabase - Offline';
  return 'Provider Supabase - Configured';
}

export function getProjectContext(pathname: string) {
  const [section, workspaceId, projectId, fourth, fifth] = pathname.split('/').filter(Boolean);
  if (!section || !workspaceId || !projectId) return null;
  if (!['projects', 'planning', 'transfer'].includes(section)) {
    return null;
  }
  const epicId = section === 'planning' && fourth === 'epics' ? fifth : undefined;
  const featureId = section === 'planning' && fourth === 'features' ? fifth : undefined;
  return { workspaceId, projectId, epicId, featureId };
}
