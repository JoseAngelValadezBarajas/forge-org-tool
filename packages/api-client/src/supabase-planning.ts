/** Workspace, project, epic and feature reads plus workspace create/delete. */

import type { Epic, Feature, Project, Workspace } from './types.js';
import { type JsonRecord, one, query } from './supabase-shared.js';
import type { SupabaseTransport } from './supabase-transport.js';
import type { createAttachmentOps } from './supabase-attachments.js';

type AttachmentOps = ReturnType<typeof createAttachmentOps>;

export function createPlanningOps({
  transport: { table, rpc },
  cleanupWorkspaceStorage,
}: {
  transport: SupabaseTransport;
  cleanupWorkspaceStorage: AttachmentOps['cleanupWorkspaceStorage'];
}) {
  async function listWorkspaces(): Promise<Workspace[]> {
    return table<Workspace[]>('workspaces', query({ select: '*', order: 'created_at.asc' }));
  }

  async function createWorkspace(body: JsonRecord): Promise<Workspace> {
    return one(
      await rpc<Workspace | Workspace[]>('forge_create_workspace', {
        p_name: body.name,
        p_description: body.description ?? null,
      }),
    );
  }

  async function deleteWorkspace(workspaceId: string): Promise<void> {
    await cleanupWorkspaceStorage(workspaceId);
    await rpc<void>('forge_delete_workspace', { p_workspace_id: workspaceId });
  }

  async function listProjects(workspaceId: string, path: string): Promise<Project[]> {
    const url = new URL(`https://forge.invalid${path}`);
    const status = url.searchParams.get('status') ?? 'active';
    const search = url.searchParams.get('search') ?? '';
    return table<Project[]>(
      'projects',
      query({
        select: '*',
        workspace_id: `eq.${workspaceId}`,
        ...(status === 'all' ? {} : { status: `eq.${status}` }),
        ...(search ? { name: `ilike.*${search.replaceAll('*', '')}*` } : {}),
        order: 'created_at.asc',
      }),
    );
  }

  async function listEpics(projectId: string): Promise<Epic[]> {
    const raw = await table<Epic[]>(
      'epics',
      query({
        select: '*',
        project_id: `eq.${projectId}`,
        order: 'created_at.asc',
      }),
    );
    const features = await table<Feature[]>(
      'features',
      query({ select: 'id,epic_id,status', project_id: `eq.${projectId}` }),
    );
    return raw.map((epic) => {
      const children = features.filter((feature) => feature.epic_id === epic.id);
      const completed = children.filter((feature) => feature.status === 'done').length;
      return {
        ...epic,
        tags: epic.tags ?? [],
        feature_count: children.length,
        completed_feature_count: completed,
        progress: children.length ? Math.round((completed / children.length) * 100) : 0,
      };
    });
  }

  async function listFeatures(projectId: string, path: string): Promise<Feature[]> {
    const url = new URL(`https://forge.invalid${path}`);
    const search = url.searchParams.get('search');
    return table<Feature[]>(
      'features',
      query({
        select: '*',
        project_id: `eq.${projectId}`,
        ...(search ? { title: `ilike.*${search.replaceAll('*', '')}*` } : {}),
        ...(url.searchParams.get('status')
          ? { status: `eq.${url.searchParams.get('status')}` }
          : {}),
        ...(url.searchParams.get('priority')
          ? { priority: `eq.${url.searchParams.get('priority')}` }
          : {}),
        ...(url.searchParams.get('epic_id')
          ? { epic_id: `eq.${url.searchParams.get('epic_id')}` }
          : {}),
        order: 'created_at.asc',
      }),
    );
  }

  async function planningOverview(workspaceId: string, projectId: string) {
    const [epics, features] = await Promise.all([
      listEpics(projectId),
      listFeatures(projectId, ''),
    ]);
    return {
      epics: epics.map((epic) => ({
        ...epic,
        features: features.filter((feature) => feature.epic_id === epic.id),
      })),
      unassigned_features: features.filter((feature) => feature.epic_id === null),
      workspace_id: workspaceId,
      project_id: projectId,
    };
  }

  return {
    listWorkspaces,
    createWorkspace,
    deleteWorkspace,
    listProjects,
    listEpics,
    listFeatures,
    planningOverview,
  };
}
