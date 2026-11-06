import { expect, type Page } from '@playwright/test';

/** Typed fixtures created through the real API, shared by every e2e spec. */
export type Workspace = { id: string; name: string };
export type Project = { id: string; name: string };

async function post<T>(page: Page, path: string, data: unknown): Promise<T> {
  const response = await page.request.post(path, { data });
  expect(response.status(), `${path}: ${await response.text()}`).toBe(201);
  return (await response.json()) as T;
}

export const createWorkspace = (page: Page, name: string) =>
  post<Workspace>(page, '/api/v1/workspaces', { name });

export const createProject = (
  page: Page,
  workspaceId: string,
  name: string,
  extra: Record<string, unknown> = {},
) => post<Project>(page, `/api/v1/workspaces/${workspaceId}/projects`, { name, ...extra });

export const createFeature = (
  page: Page,
  workspaceId: string,
  projectId: string,
  data: Record<string, unknown>,
) =>
  post<{ id: string }>(
    page,
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features`,
    data,
  );

/** A workspace with one project: the starting point of almost every journey. */
export async function createWorkspaceWithProject(
  page: Page,
  names: { workspace: string; project: string; projectExtra?: Record<string, unknown> },
) {
  const workspace = await createWorkspace(page, names.workspace);
  const project = await createProject(page, workspace.id, names.project, names.projectExtra);
  return { workspace, project };
}
