import { Link, useParams } from 'react-router-dom';
import { Button, Card, FormField, Input, SearchField, SectionHeader, Select } from '@forge-org/ui';
import type { Feature } from '@forge-org/api-client';
import styles from './PlanningPage.module.css';
import { usePlanningController } from './usePlanningController';
import {
  DependencyGroup,
  EpicCard,
  FeatureCard,
  FilterBar,
  KanbanColumn,
  ProjectPlanningHome,
} from './components';

export function PlanningPage() {
  const { workspaceId = '', projectId = '' } = useParams();
  const {
    addDependency,
    blockedFeatureId,
    blockingFeatureId,
    createEpic,
    createFeature,
    dependencies,
    epicFilter,
    error,
    featureName,
    featureTitle,
    features,
    overview,
    priorityFilter,
    removeDependency,
    search,
    setBlockedFeatureId,
    setBlockingFeatureId,
    setEpicFilter,
    setFeatureTitle,
    setPriorityFilter,
    setSearch,
    setStatusFilter,
    setTitle,
    statusFilter,
    title,
    updateFeature,
    visibleFeatures,
  } = usePlanningController(workspaceId, projectId);
  return (
    <ProjectPlanningHome>
      <div className={styles.stack}>
        <SectionHeader title="Planning" eyebrow="FORGE / Manual planning" />
        <p>
          Planning status, priority, search, filters, and dependencies are manual product records
          only; they never claim execution or delivery evidence.
        </p>
        {error && <p role="alert">{error}</p>}
        <div className={styles.forms}>
          <Card>
            <form onSubmit={createEpic}>
              <label htmlFor="epic-title">Epic title</label>
              <Input
                id="epic-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
              <Button type="submit">Create Epic</Button>
            </form>
          </Card>
          <Card>
            <form onSubmit={createFeature}>
              <label htmlFor="feature-title">Feature title</label>
              <Input
                id="feature-title"
                value={featureTitle}
                onChange={(event) => setFeatureTitle(event.target.value)}
                required
              />
              <Button type="submit">Create Feature</Button>
            </form>
          </Card>
        </div>
        <section aria-labelledby="planning-epics-heading">
          <h2 id="planning-epics-heading">Epics</h2>
          <div className={styles.forms}>
            {overview.epics.map((epic) => (
              <EpicCard key={epic.id} epic={epic}>
                {epic.features.map((feature: Feature) => (
                  <span key={feature.id}>{feature.title}</span>
                ))}
              </EpicCard>
            ))}
          </div>
        </section>
        <FilterBar resultCount={visibleFeatures.length}>
          <div className={styles.forms}>
            <FormField label="Search planning">
              <SearchField
                aria-label="Search planning"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </FormField>
            <FormField label="Status">
              <Select
                aria-label="Filter planning by status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="backlog">Backlog</option>
                <option value="in_progress">In progress</option>
                <option value="verify">Verify</option>
                <option value="done">Done</option>
              </Select>
            </FormField>
            <FormField label="Priority">
              <Select
                aria-label="Filter planning by priority"
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
              >
                <option value="all">All priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </Select>
            </FormField>
            <FormField label="Epic">
              <Select
                aria-label="Filter planning by epic"
                value={epicFilter}
                onChange={(event) => setEpicFilter(event.target.value)}
              >
                <option value="all">All epics</option>
                <option value="unassigned">Unassigned</option>
                {overview.epics.map((epic) => (
                  <option key={epic.id} value={epic.id}>
                    {epic.title}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
        </FilterBar>
        <div className={styles.board} aria-label="Planning board">
          {(['backlog', 'in_progress', 'verify', 'done'] as const).map((status) => {
            const columnFeatures = visibleFeatures.filter((feature) => feature.status === status);
            return (
              <KanbanColumn key={status} status={status}>
                {columnFeatures.map((feature) => (
                  <FeatureCard
                    key={feature.id}
                    feature={feature}
                    href={`/planning/${workspaceId}/${projectId}/features/${feature.id}`}
                  >
                    <div>
                      <label>
                        Priority
                        <select
                          aria-label={`Priority for ${feature.title}`}
                          value={feature.priority}
                          onChange={(event) =>
                            void updateFeature(feature, {
                              priority: event.target.value as Feature['priority'],
                            })
                          }
                        >
                          <option value="low">low</option>
                          <option value="medium">medium</option>
                          <option value="high">high</option>
                          <option value="critical">critical</option>
                        </select>
                      </label>
                      <label>
                        Status
                        <select
                          aria-label={`Status for ${feature.title}`}
                          value={feature.status}
                          onChange={(event) =>
                            void updateFeature(feature, {
                              status: event.target.value as Feature['status'],
                            })
                          }
                        >
                          <option value="backlog">backlog</option>
                          <option value="in_progress">in progress</option>
                          <option value="verify">verify</option>
                          <option value="done">done</option>
                        </select>
                      </label>
                      <label>
                        Epic
                        <select
                          aria-label={`Epic for ${feature.title}`}
                          value={feature.epic_id ?? 'unassigned'}
                          onChange={(event) =>
                            void updateFeature(
                              feature,
                              event.target.value === 'unassigned'
                                ? { clear_epic: true }
                                : { epic_id: event.target.value },
                            )
                          }
                        >
                          <option value="unassigned">unassigned</option>
                          {overview.epics.map((epic) => (
                            <option key={epic.id} value={epic.id}>
                              {epic.title}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <Link to={`/readiness/${workspaceId}/${projectId}/${feature.id}`}>
                      Readiness
                    </Link>
                  </FeatureCard>
                ))}
              </KanbanColumn>
            );
          })}
        </div>
        <Card>
          <form onSubmit={addDependency}>
            <h3>Planning dependencies</h3>
            <label>
              Blocking feature
              <select
                aria-label="Blocking feature"
                value={blockingFeatureId}
                onChange={(event) => setBlockingFeatureId(event.target.value)}
              >
                <option value="">Select feature</option>
                {features.map((feature) => (
                  <option key={feature.id} value={feature.id}>
                    {feature.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Blocked feature
              <select
                aria-label="Blocked feature"
                value={blockedFeatureId}
                onChange={(event) => setBlockedFeatureId(event.target.value)}
              >
                <option value="">Select feature</option>
                {features.map((feature) => (
                  <option key={feature.id} value={feature.id}>
                    {feature.title}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit">Add dependency</Button>
          </form>
          {dependencies.map((dependency) => (
            <DependencyGroup
              key={dependency.id}
              blocker={featureName(dependency.blocking_feature_id)}
              blocked={featureName(dependency.blocked_feature_id)}
            >
              <Button
                type="button"
                variant="secondary"
                onClick={() => void removeDependency(dependency)}
              >
                Remove dependency
              </Button>
            </DependencyGroup>
          ))}
        </Card>
      </div>
    </ProjectPlanningHome>
  );
}
