import { useParams } from 'react-router-dom';
import { Button, Card, Input, SectionHeader } from '@forge-org/ui';
import styles from './ReadinessPage.module.css';
import { useReadinessController } from './useReadinessController';
import {
  DecisionCard,
  EvaluationSnapshot,
  InvariantCard,
  RevisionHistory,
  RuleAction,
  RuleCard,
} from './components';

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
      {result ? (
        <EvaluationSnapshot
          fingerprint={result.input_fingerprint}
          evaluatedAt={result.evaluated_at}
          stale={result.stale}
        >
          <p>Outcome: {result.outcome}</p>
          <p>Rules passed: {result.passed_checks.join(', ') || 'none'}</p>
          <div className={styles.ruleGrid}>
            {result.results.map((rule) => (
              <RuleCard
                key={rule.rule_id}
                ruleId={rule.rule_id}
                result={rule.result}
                explanation={rule.explanation}
              />
            ))}
          </div>
          {result.blockers.length > 0 && (
            <ul>
              {result.blockers.map((blocker) => (
                <li key={blocker.code}>
                  {blocker.code}: {blocker.message}
                </li>
              ))}
            </ul>
          )}
          <RuleAction onClick={() => void refresh()}>Refresh evaluation</RuleAction>
        </EvaluationSnapshot>
      ) : (
        <Card>
          <p>Evaluating readiness…</p>
          <RuleAction onClick={() => void refresh()}>Refresh evaluation</RuleAction>
        </Card>
      )}
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
            <DecisionCard
              key={decision.id}
              title={decision.title}
              revision={decision.revision}
              status={decision.status}
            >
              <div>
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
                <RevisionHistory
                  title={`${decision.title} history`}
                  revisions={decisionRevisions[decision.id].map((revision) => ({
                    revision: revision.revision,
                    text: revision.decision,
                  }))}
                />
              )}
            </DecisionCard>
          ))
        )}
      </Card>
      <Card>
        <h3>Invariants</h3>
        {invariants.length === 0 ? (
          <p>No invariants recorded.</p>
        ) : (
          invariants.map((invariant) => (
            <InvariantCard
              key={invariant.id}
              title={invariant.title}
              revision={invariant.revision}
              acknowledgedRevision={invariant.acknowledged_revision}
            >
              <div>
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
            </InvariantCard>
          ))
        )}
      </Card>
    </div>
  );
}
