import { useParams } from 'react-router-dom';
import { Button, Card, Input, SectionHeader, StatusChip } from '@forge-org/ui';
import styles from './ReadinessPage.module.css';
import { useReadinessController } from './useReadinessController';

export function ReadinessPage() {
  const { workspaceId = '', projectId = '', featureId = '' } = useParams();
  const {
    acceptDecision,
    acknowledgeInvariant,
    addCriterion,
    addDecision,
    addInvariant,
    criterion,
    decisionRevisions,
    decisionTitle,
    decisions,
    error,
    invariantTitle,
    invariants,
    refresh,
    result,
    setCriterion,
    setDecisionTitle,
    setInvariantTitle,
    showDecisionRevisions,
  } = useReadinessController(workspaceId, projectId, featureId);

  return (
    <div className={styles.stack}>
      <SectionHeader title="Readiness" eyebrow="FORGE / Planning gate" />
      <p>
        This is a deterministic planning evaluation, not delivery, CI, deployment, or technical
        verification.
      </p>
      {error && <p role="alert">{error}</p>}
      <Card>
        <div className={styles.result}>
          <StatusChip tone={result?.outcome === 'READY_TO_START' ? 'success' : 'warning'}>
            {result?.outcome ?? 'Evaluating'}
          </StatusChip>
          <Button variant="secondary" onClick={() => void refresh()}>
            Refresh evaluation
          </Button>
        </div>
        {result && (
          <>
            <p>Rules passed: {result.passed_checks.join(', ') || 'none'}</p>
            <ul>
              {result.blockers.map((blocker) => (
                <li key={blocker.code}>
                  {blocker.code}: {blocker.message}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
      <div className={styles.forms}>
        <Card>
          <form onSubmit={addCriterion}>
            <h3>Acceptance criteria</h3>
            <Input
              aria-label="Acceptance criterion"
              value={criterion}
              onChange={(event) => setCriterion(event.target.value)}
              placeholder="Describe expected behavior"
            />
            <Button type="submit">Add criterion</Button>
          </form>
        </Card>
        <Card>
          <form onSubmit={addDecision}>
            <h3>Decision</h3>
            <Input
              aria-label="Decision title"
              value={decisionTitle}
              onChange={(event) => setDecisionTitle(event.target.value)}
              placeholder="Record a decision"
            />
            <Button type="submit">Link decision</Button>
          </form>
        </Card>
        <Card>
          <form onSubmit={addInvariant}>
            <h3>Invariant</h3>
            <Input
              aria-label="Invariant title"
              value={invariantTitle}
              onChange={(event) => setInvariantTitle(event.target.value)}
              placeholder="Record a rule"
            />
            <Button type="submit">Add invariant</Button>
          </form>
        </Card>
      </div>
      <Card>
        <h3>Decisions</h3>
        {decisions.length === 0 ? (
          <p>No decisions recorded.</p>
        ) : (
          decisions.map((decision) => (
            <article key={decision.id}>
              <div>
                <strong>{decision.title}</strong>
                <p>
                  Revision {decision.revision} · {decision.status}
                </p>
                <p>{decision.decision}</p>
              </div>
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void showDecisionRevisions(decision)}
                  aria-label={`Show decision revisions for ${decision.title}`}
                >
                  History
                </Button>
                {decision.status !== 'ACCEPTED' && (
                  <Button type="button" onClick={() => void acceptDecision(decision)}>
                    Accept decision
                  </Button>
                )}
              </div>
              {decisionRevisions[decision.id] && (
                <ul>
                  {decisionRevisions[decision.id].map((revision) => (
                    <li key={revision.id}>
                      Revision {revision.revision}: {revision.decision}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))
        )}
      </Card>
      <Card>
        <h3>Invariants</h3>
        {invariants.length === 0 ? (
          <p>No invariants recorded.</p>
        ) : (
          invariants.map((invariant) => (
            <article key={invariant.id}>
              <div>
                <strong>{invariant.title}</strong>
                <p>
                  Revision {invariant.revision} · {invariant.status}
                </p>
                <p>{invariant.statement}</p>
              </div>
              {invariant.feature_id === featureId &&
                invariant.acknowledged_revision !== invariant.revision && (
                  <Button
                    type="button"
                    onClick={() => void acknowledgeInvariant(invariant)}
                    aria-label={`Acknowledge invariant ${invariant.title}`}
                  >
                    Acknowledge invariant
                  </Button>
                )}
              {invariant.acknowledged_revision === invariant.revision && (
                <StatusChip tone="success">Acknowledged revision {invariant.revision}</StatusChip>
              )}
            </article>
          ))
        )}
      </Card>
    </div>
  );
}
