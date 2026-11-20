/** Workspace, project, epic and feature reads plus workspace create/delete. */

import { ApiError } from './errors.js';
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

  /**
   * Moves a work item to another active project of the same workspace. Supabase scopes Bug
   * screenshots by their storage path (workspace/project/feature) and dependencies by project,
   * so an item that has either is refused instead of being left half-moved.
   */
  async function moveFeature(
    workspaceId: string,
    projectId: string,
    featureId: string,
    body: JsonRecord,
  ): Promise<Feature> {
    const destination = typeof body.project_id === 'string' ? body.project_id : '';
    const epicId = typeof body.epic_id === 'string' && body.epic_id ? body.epic_id : null;
    if (!destination) throw new ApiError(422, 'A destination project is required.');
    if (destination === projectId) {
      throw new ApiError(422, 'The work item is already in this project.');
    }
    const projects = await table<Array<{ id: string; status: string }>>(
      'projects',
      query({ select: 'id,status', id: `eq.${destination}`, workspace_id: `eq.${workspaceId}` }),
    );
    if (projects.length === 0) throw new ApiError(404, 'Destination project not found.');
    if (projects[0].status !== 'active') {
      throw new ApiError(422, 'Archived projects cannot receive work items.');
    }
    if (epicId) {
      const epics = await table<Array<{ id: string }>>(
        'epics',
        query({ select: 'id', id: `eq.${epicId}`, project_id: `eq.${destination}` }),
      );
      if (epics.length === 0) {
        throw new ApiError(404, 'Epic not found in the destination project.');
      }
    }
    const dependencies = await table<Array<{ id: string }>>(
      'feature_dependencies',
      query({
        select: 'id',
        or: `(blocking_feature_id.eq.${featureId},blocked_feature_id.eq.${featureId})`,
        limit: '1',
      }),
    );
    if (dependencies.length > 0) {
      throw new ApiError(
        409,
        'This work item has dependencies. Remove them before moving it to another project.',
      );
    }
    const screenshots = await table<Array<{ id: string }>>(
      'bug_attachments',
      query({ select: 'id', feature_id: `eq.${featureId}`, limit: '1' }),
    );
    if (screenshots.length > 0) {
      throw new ApiError(
        409,
        'This work item has screenshots stored under its current project. Remove them before moving it.',
      );
    }
    return one(
      await table<Feature[]>(
        'features',
        query({ id: `eq.${featureId}`, project_id: `eq.${projectId}` }),
        { method: 'PATCH', body: JSON.stringify({ project_id: destination, epic_id: epicId }) },
      ),
    );
  }

  return {
    moveFeature,
    listWorkspaces,
    createWorkspace,
    deleteWorkspace,
    listProjects,
    listEpics,
    listFeatures,
    planningOverview,
  };
}
