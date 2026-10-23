import { useState, type ReactNode } from 'react';
import { Button, SearchField } from '@forge-org/ui';
import { CommandPalette, NavigationItem, PageHeader, WorkspaceSwitcher } from '../../shell';
import { OrganizationEmptyState } from '../../../features/organization';
import {
  CriterionItem,
  DependencyGroup,
  EpicCard,
  FeatureCard,
  FeatureOverview,
  FilterBar,
  KanbanColumn,
  ProjectCard,
  ProjectPlanningHome,
  TaskItem,
} from '../../../features/planning';
import {
  DecisionCard,
  EvaluationSnapshot,
  InvariantCard,
  RevisionHistory,
  RuleAction,
  RuleCard,
} from '../../../features/readiness';
import { RepositoryCard } from '../../../features/repositories';
import { ContextPackageCard } from '../../../features/context';
import { ProvenanceNotice, ReportField } from '../../../features/workbench';
import {
  DownloadAction,
  ReleaseGate,
  TrustDisclosure,
  VerificationSummary,
} from '../../../features/delivery';
import {
  previewContextPackage,
  previewCriterion,
  previewEpic,
  previewFeature,
  previewObservation,
  previewProject,
  previewReadiness,
  previewRepository,
  previewTask,
} from './fixtures';
import styles from '../ComponentGallery.module.css';

export function renderProductPatternPreview(componentId: string): ReactNode | null {
  let content: ReactNode;
  switch (componentId) {
    case 'organization-empty-state':
      content = <OrganizationEmptyState />;
      break;
    case 'page-header':
      content = (
        <div className={styles.previewStack}>
          <PageHeader
            title="Planning overview"
            eyebrow="FORGE / Preview workspace"
            description="A feature-owned page heading with an optional action slot."
          >
            <Button variant="secondary">Open command palette</Button>
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
      break;
    case 'workspace-switcher':
      content = (
        <div className={styles.productStates}>
          <WorkspaceSwitcher
            value="one"
            workspaces={[
              { id: 'one', name: 'Atlas' },
              { id: 'two', name: 'Beacon' },
            ]}
            onChange={() => undefined}
          />
          <WorkspaceSwitcher value="one" currentName="Atlas" />
        </div>
      );
      break;
    case 'command-palette':
      content = <PalettePreview />;
      break;
    case 'navigation-item':
      content = (
        <nav aria-label="Preview product navigation" className={styles.productStates}>
          <NavigationItem to="/__components" end label="Selected route" />
          <NavigationItem to="/planning/preview" label="Other route" />
          <NavigationItem to="/planning/preview" label="Unavailable" disabled />
        </nav>
      );
      break;
    case 'project-card':
      content = (
        <div className={styles.productStates}>
          <ProjectCard project={previewProject} workspaceId="host-workspace" />
          <ProjectCard
            project={{ ...previewProject, id: 'archived-project', status: 'archived' }}
            workspaceId="host-workspace"
          />
        </div>
      );
      break;
    case 'epic-card':
      content = (
        <div className={styles.productStates}>
          <EpicCard epic={previewEpic} />
          <EpicCard epic={{ ...previewEpic, features: [] }} />
          <EpicCard epic={{ ...previewEpic, features: [{ ...previewFeature, status: 'done' }] }} />
        </div>
      );
      break;
    case 'feature-card':
      content = (
        <div className={styles.productStates}>
          <FeatureCard
            feature={{ ...previewFeature, status: 'backlog' }}
            href="/planning/host-project/host-feature"
          />
          <FeatureCard feature={previewFeature} href="/planning/host-project/host-feature" />
          <FeatureCard
            feature={{ ...previewFeature, status: 'done' }}
            href="/planning/host-project/host-feature"
            readOnly
          />
        </div>
      );
      break;
    case 'kanban-column':
      content = (
        <div className={styles.productStates}>
          <KanbanColumn status="in_progress">
            <FeatureCard feature={previewFeature} href="/planning/host-project/host-feature" />
          </KanbanColumn>
          <KanbanColumn status="done" />
        </div>
      );
      break;
    case 'task-item':
      content = (
        <div className={styles.productStates}>
          <TaskItem
            task={previewTask}
            onStatusChange={() => undefined}
            onMoveUp={() => undefined}
            onMoveDown={() => undefined}
          />
          <TaskItem
            task={previewTask}
            editing
            onStatusChange={() => undefined}
            onMoveUp={() => undefined}
            onMoveDown={() => undefined}
          />
          <TaskItem
            task={previewTask}
            archived
            onStatusChange={() => undefined}
            onMoveUp={() => undefined}
            onMoveDown={() => undefined}
          />
        </div>
      );
      break;
    case 'criterion-item':
      content = (
        <ul className={styles.productStates}>
          <CriterionItem criterion={previewCriterion} />
          <CriterionItem criterion={{ ...previewCriterion, satisfied: true }} />
          <CriterionItem criterion={previewCriterion} editing />
          <CriterionItem criterion={previewCriterion} archived />
        </ul>
      );
      break;
    case 'dependency-group':
      content = (
        <div className={styles.productStates}>
          <DependencyGroup blocker="API contract" blocked="UI adoption" state="Blocked" />
          <DependencyGroup blocker="Completed prerequisite" blocked="UI adoption" state="Clear" />
          <DependencyGroup blocker="Archived prerequisite" blocked="Archived task" archived />
        </div>
      );
      break;
    case 'filter-bar':
      content = (
        <div className={styles.productStates}>
          <FilterBar>
            <SearchField aria-label="Filter planning preview" placeholder="Search planning" />
          </FilterBar>
          <FilterBar resultCount={2}>
            <SearchField aria-label="Filtered planning preview" value="Atlas" readOnly />
          </FilterBar>
          <FilterBar resultCount={0}>
            <SearchField aria-label="No results planning preview" value="missing" readOnly />
          </FilterBar>
        </div>
      );
      break;
    case 'feature-overview':
      content = (
        <div className={styles.productStates}>
          <FeatureOverview
            result={{ ...previewReadiness, outcome: 'READY_TO_START', blockers: [] }}
          />
          <FeatureOverview result={previewReadiness} />
          <FeatureOverview result={null} />
        </div>
      );
      break;
    case 'project-planning-home':
      content = (
        <div className={styles.productStates}>
          <ProjectPlanningHome state="Default" />
          <ProjectPlanningHome state="Empty" />
          <ProjectPlanningHome state="Archived" />
        </div>
      );
      break;
    case 'rule-card':
      content = (
        <div className={styles.productStates}>
          <RuleCard ruleId="R01" result="PASS" explanation="Planning record is present." />
          <RuleCard ruleId="R02" result="BLOCKED" explanation="A planning input is missing." />
          <RuleCard ruleId="R03" result="UNAVAILABLE" explanation="Evaluation is unavailable." />
        </div>
      );
      break;
    case 'evaluation-snapshot':
      content = (
        <div className={styles.productStates}>
          <EvaluationSnapshot fingerprint="sha256:preview-only" evaluatedAt="Preview only" />
          <EvaluationSnapshot
            fingerprint="sha256:saved-preview"
            evaluatedAt="Saved preview"
            state="Saved"
          />
          <EvaluationSnapshot
            fingerprint="sha256:historical-preview"
            evaluatedAt="Historical preview"
            stale
          />
        </div>
      );
      break;
    case 'rule-action':
      content = (
        <div className={styles.previewRow}>
          <RuleAction onClick={() => undefined}>Refresh evaluation</RuleAction>
          <RuleAction archived>Archived action</RuleAction>
          <RuleAction disabled>Unavailable action</RuleAction>
        </div>
      );
      break;
    case 'decision-card':
      content = (
        <div className={styles.productStates}>
          <DecisionCard title="Keep local-first workflow" revision={2} status="PROPOSED" />
          <DecisionCard title="Use deterministic gates" revision={3} status="ACCEPTED" />
          <DecisionCard title="Previous execution path" revision={1} status="SUPERSEDED" />
        </div>
      );
      break;
    case 'revision-history':
      content = (
        <RevisionHistory
          title="Decision history"
          revisions={[
            { revision: 1, text: 'Initial proposal (superseded).' },
            { revision: 2, text: 'Current reviewed decision.' },
          ]}
        />
      );
      break;
    case 'invariant-card':
      content = (
        <div className={styles.productStates}>
          <InvariantCard title="No unverified claims" revision={3} acknowledgedRevision={null} />
          <InvariantCard title="Human review required" revision={2} acknowledgedRevision={2} />
          <InvariantCard
            title="Re-acknowledgement required"
            revision={4}
            acknowledgedRevision={3}
          />
        </div>
      );
      break;
    case 'repository-card':
      content = (
        <div className={styles.productStates}>
          <RepositoryCard repository={previewRepository} />
          <RepositoryCard repository={previewRepository} observation={previewObservation} />
          <RepositoryCard repository={{ ...previewRepository, status: 'unavailable' }} />
        </div>
      );
      break;
    case 'context-package-card':
      content = (
        <div className={styles.productStates}>
          <ContextPackageCard contextPackage={previewContextPackage} state="Fresh" />
          <ContextPackageCard contextPackage={previewContextPackage} state="Stale" />
          <ContextPackageCard state="Unavailable" />
        </div>
      );
      break;
    case 'report-field':
      content = (
        <div className={styles.productStates}>
          <ReportField label="Executor" value="Human" />
          <ReportField label="Optional note" value="" />
        </div>
      );
      break;
    case 'provenance-notice':
      content = (
        <div className={styles.productStates}>
          <ProvenanceNotice source="Human-reported run summary">
            No independent verification is implied.
          </ProvenanceNotice>
          <ProvenanceNotice state="Observed" source="Synthetic host observation">
            Observed context is not independently verified.
          </ProvenanceNotice>
          <ProvenanceNotice state="Unknown" source="No provenance recorded">
            The originating source is unknown.
          </ProvenanceNotice>
        </div>
      );
      break;
    case 'trust-disclosure':
      content = (
        <div className={styles.productStates}>
          <TrustDisclosure state="Default">
            A blocked gate is not a publication, deployment, or release claim.
          </TrustDisclosure>
          <TrustDisclosure state="Expanded">
            A blocked gate is not a publication, deployment, or release claim.
          </TrustDisclosure>
        </div>
      );
      break;
    case 'download-action':
      content = (
        <div className={styles.productStates}>
          <DownloadAction label="Download manifest" href="#preview-manifest" />
          <DownloadAction label="Download report" state="pending" />
          <DownloadAction
            label="Download failed"
            state="error"
            errorMessage="Artifact unavailable."
          />
        </div>
      );
      break;
    case 'verification-summary':
      content = (
        <div className={styles.productStates}>
          <VerificationSummary outcome="PASS" fingerprint="sha256:scoped" blockers={[]} />
          <VerificationSummary outcome="NOT_RUN" fingerprint="sha256:not-run" blockers={[]} />
          <VerificationSummary
            outcome="FAIL"
            fingerprint="sha256:blocked"
            blockers={['Required evidence is missing.']}
          />
          <VerificationSummary outcome="PASS" fingerprint="sha256:stale" blockers={[]} stale />
        </div>
      );
      break;
    case 'release-gate':
      content = (
        <div className={styles.productStates}>
          <ReleaseGate outcome="BLOCKED">
            <p>Required review is incomplete.</p>
          </ReleaseGate>
          <ReleaseGate outcome="NOT_READY" />
          <ReleaseGate outcome="SCOPED PASS">
            <p>Scoped checks passed; this is not a release action.</p>
          </ReleaseGate>
        </div>
      );
      break;
    default:
      return null;
  }
  return (
    <div className={styles.productFrame}>
      <div className={styles.productStates} data-product-pattern={componentId}>
        {content}
      </div>
    </div>
  );
}

function PalettePreview() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open command palette preview
      </Button>
      <CommandPalette
        open={open}
        onClose={close}
        commands={[
          { id: 'planning', label: 'Planning', onSelect: close },
          { id: 'readiness', label: 'Readiness', onSelect: close },
        ]}
      />
      <CommandPalette open={false} commands={[]} onClose={close} />
    </>
  );
}
