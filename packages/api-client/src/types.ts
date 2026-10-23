import type { components } from './generated/openapi.js';

type Schema = components['schemas'];

/** Response models are aliases to the generated backend OpenAPI contract. */
export type Workspace = Schema['WorkspaceResponse'];
export type WorkspaceUpdate = Schema['WorkspaceUpdate'];
export type Project = Schema['ProjectResponse'];
export type ProjectUpdate = Schema['ProjectUpdate'];
export type Epic = Schema['EpicResponse'];
export type EpicStatus = Epic['status'];
export type WorkspaceTag = Schema['WorkspaceTagResponse'];
export type BugAttachment = Schema['BugAttachmentResponse'];
export type Feature = Schema['FeatureResponse'];
export type Task = Schema['TaskResponse'];
export type Criterion = Schema['CriterionResponse'];
export type Dependency = Schema['DependencyResponse'];
export type ProjectTransferPreview = {
  schema_version: Schema['ImportPreviewResponse']['schema_version'];
  fingerprint: Schema['ImportPreviewResponse']['fingerprint'];
  counts: Schema['ImportPreviewResponse']['counts'];
  project: { name: string; description?: string | null };
  destination?: { scope: string; id: string };
};
export type ContextualTransferScope = 'epics' | 'work-items' | 'tasks';

export type PlanningOverview = {
  epics: Array<Epic & { features: Feature[] }>;
  unassigned_features: Feature[];
};
