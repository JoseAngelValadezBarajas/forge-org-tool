import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  organizationApi,
  type Decision,
  type DecisionRevision,
  type Invariant,
  type ReadinessResult,
} from '@forge-org/api-client';

export function useReadinessController(workspaceId: string, projectId: string, featureId: string) {
  const [result, setResult] = useState<ReadinessResult | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [invariants, setInvariants] = useState<Invariant[]>([]);
  const [decisionRevisions, setDecisionRevisions] = useState<Record<string, DecisionRevision[]>>(
    {},
  );
  const [criterion, setCriterion] = useState('');
  const [decisionTitle, setDecisionTitle] = useState('');
  const [invariantTitle, setInvariantTitle] = useState('');
  const [error, setError] = useState('');
  const refreshGeneration = useRef(0);

  const refresh = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      const generation = ++refreshGeneration.current;
      try {
        const [nextReadiness, nextDecisions, nextInvariants] = await Promise.all([
          organizationApi.previewReadiness(workspaceId, projectId, featureId),
          organizationApi.listDecisions(workspaceId, projectId),
          organizationApi.listInvariants(workspaceId, projectId, featureId),
        ]);
        if (!isCurrent() || generation !== refreshGeneration.current) return;
        setResult(nextReadiness);
        setDecisions(nextDecisions);
        setInvariants(nextInvariants);
      } catch (cause) {
        if (isCurrent() && generation === refreshGeneration.current) {
          setError(cause instanceof Error ? cause.message : 'Unable to evaluate readiness.');
        }
      }
    },
    [featureId, projectId, workspaceId],
  );

  useEffect(() => {
    let current = true;
    queueMicrotask(() => void refresh(() => current));
    return () => {
      current = false;
    };
  }, [refresh]);

  async function addCriterion(event: FormEvent) {
    event.preventDefault();
    if (!criterion.trim()) return;
    try {
      await organizationApi.createCriterion(workspaceId, projectId, featureId, criterion);
      setCriterion('');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to add criterion.');
    }
  }

  async function addDecision(event: FormEvent) {
    event.preventDefault();
    if (!decisionTitle.trim()) return;
    try {
      const decision = await organizationApi.createDecision(workspaceId, projectId, {
        title: decisionTitle,
        context: 'Recorded in FORGE planning',
        decision: decisionTitle,
        rationale: 'Explicit product context',
      });
      await organizationApi.linkDecision(workspaceId, projectId, decision.id, featureId);
      setDecisionTitle('');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to record decision.');
    }
  }

  async function addInvariant(event: FormEvent) {
    event.preventDefault();
    if (!invariantTitle.trim()) return;
    try {
      await organizationApi.createInvariant(workspaceId, projectId, {
        title: invariantTitle,
        statement: invariantTitle,
        rationale: 'Explicit product invariant',
        feature_id: featureId,
      });
      setInvariantTitle('');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to record invariant.');
    }
  }

  async function acceptDecision(decision: Decision) {
    try {
      await organizationApi.acceptDecision(workspaceId, projectId, decision.id);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to accept decision.');
    }
  }

  async function showDecisionRevisions(decision: Decision) {
    try {
      const revisions = await organizationApi.listDecisionRevisions(
        workspaceId,
        projectId,
        decision.id,
      );
      setDecisionRevisions((current) => ({ ...current, [decision.id]: revisions }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load decision history.');
    }
  }

  async function acknowledgeInvariant(invariant: Invariant) {
    try {
      await organizationApi.acknowledgeInvariant(
        workspaceId,
        projectId,
        featureId,
        invariant.id,
        invariant.revision,
      );
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to acknowledge invariant.');
    }
  }

  return {
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
  };
}
