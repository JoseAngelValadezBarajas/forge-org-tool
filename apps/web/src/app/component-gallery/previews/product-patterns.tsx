import type { ReactNode } from 'react';
import { Button } from '@forge-org/ui';
import { OrganizationEmptyState } from '../../../features/organization';
import {
  CriterionItem,
  DependencyGroup,
  EpicCard,
  FeatureCard,
  FilterBar,
  KanbanColumn,
  ProjectCard,
  ProjectPlanningHome,
  TaskItem,
} from '../../../features/planning';
import { CommandPalette, NavigationItem, PageHeader, WorkspaceSwitcher } from '../../shell';
import styles from '../ComponentGallery.module.css';

const project = {
  id: 'host-project',
  workspace_id: 'host-workspace',
  name: 'Atlas planning',
  description: 'Synthetic preview project.',
  status: 'active' as const,
  archived_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};
const feature = {
  id: 'host-feature',
  project_id: project.id,
  epic_id: 'host-epic',
  title: 'Review local planning changes',
  description: 'A synthetic Story/Feature for the Component Host.',
  goal: 'Keep work explicit.',
  status: 'in_progress' as const,
  priority: 'high' as const,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};
const epic = {
  id: 'host-epic',
  project_id: project.id,
  title: 'Planning foundations',
  description: 'Synthetic Epic preview.',
  status: 'active' as const,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  features: [feature],
};
const task = {
  id: 'host-task',
  feature_id: feature.id,
  title: 'Confirm acceptance criteria',
  description: null,
  position: 0,
  status: 'in_progress' as const,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};
const criterion = {
  id: 'host-criterion',
  feature_id: feature.id,
  description: 'The review remains human-owned.',
  position: 0,
  satisfied: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

export function renderProductPatternPreview(componentId: string): ReactNode | null {
  switch (componentId) {
    case 'organization-empty-state':
      return <OrganizationEmptyState />;
    case 'page-header':
      return (
        <div className={styles.previewStack}>
          <PageHeader title="Planning overview" eyebrow="FORGE / Preview workspace">
            <Button variant="secondary">Create Epic</Button>
          </PageHeader>
          <PageHeader
            title="Feature detail"
            eyebrow="FORGE / Atlas"
            breadcrumbs={[
              { label: 'Workspace', href: '/' },
              { label: 'Planning', href: '/planning/preview' },
              { label: 'Feature detail' },
            ]}
          />
        </div>
      );
    case 'workspace-switcher':
      return (
        <WorkspaceSwitcher
          value="one"
          workspaces={[
            { id: 'one', name: 'Atlas' },
            { id: 'two', name: 'Beacon' },
          ]}
          onChange={() => undefined}
        />
      );
    case 'command-palette':
      return <CommandPalette open onClose={() => undefined} commands={[]} />;
    case 'navigation-item':
      return (
        <nav aria-label="Preview product navigation" className={styles.productStates}>
          <NavigationItem to="/__components" end label="Selected route" />
          <NavigationItem to="/planning/preview" label="Planning" />
          <NavigationItem to="/planning/preview" label="Unavailable" disabled />
        </nav>
      );
    case 'project-card':
      return <ProjectCard project={project} workspaceId={project.workspace_id} />;
    case 'epic-card':
      return <EpicCard epic={epic} />;
    case 'feature-card':
      return <FeatureCard feature={feature} href="/planning/host-workspace/host-project" />;
    case 'kanban-column':
      return (
        <KanbanColumn status="in_progress">
          <FeatureCard feature={feature} href="#" />
        </KanbanColumn>
      );
    case 'task-item':
      return (
        <TaskItem
          task={task}
          onStatusChange={() => undefined}
          onMoveUp={() => undefined}
          onMoveDown={() => undefined}
        />
      );
    case 'criterion-item':
      return (
        <ul>
          <CriterionItem criterion={criterion} />
        </ul>
      );
    case 'dependency-group':
      return <DependencyGroup blocker="Plan workspace" blocked="Create Epic" />;
    case 'filter-bar':
      return (
        <FilterBar resultCount={1}>
          <label>
            Search <input aria-label="Search planning" />
          </label>
        </FilterBar>
      );
    case 'project-planning-home':
      return <ProjectPlanningHome state="Default" />;
    default:
      return null;
  }
}
