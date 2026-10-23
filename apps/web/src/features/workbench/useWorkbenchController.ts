import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  organizationApi,
  type Handoff,
  type HandoffRevision,
  type Run,
} from '@forge-org/api-client';

export function useWorkbenchController(workspaceId: string, projectId: string) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [revisions, setRevisions] = useState<Record<string, HandoffRevision[]>>({});
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyHandoffId, setBusyHandoffId] = useState<string | null>(null);

  const load = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      setLoading(true);
      setError('');
      try {
        const [nextRuns, nextHandoffs] = await Promise.all([
          organizationApi.listRuns(workspaceId, projectId),
          organizationApi.listHandoffs(workspaceId, projectId),
        ]);
        const nextRevisions = await Promise.all(
          nextHandoffs.map(
            async (handoff) =>
              [
                handoff.id,
                await organizationApi.listHandoffRevisions(workspaceId, projectId, handoff.id),
              ] as const,
          ),
        );
        if (!isCurrent()) return;
        setRuns(nextRuns);
        setHandoffs(nextHandoffs);
        setRevisions(Object.fromEntries(nextRevisions));
        setLoading(false);
      } catch (cause) {
        if (isCurrent()) {
          setError(cause instanceof Error ? cause.message : 'Unable to load reported work.');
          setLoading(false);
        }
      }
    },
    [projectId, workspaceId],
  );

  useEffect(() => {
    let current = true;
    queueMicrotask(() => void load(() => current));
    return () => {
      current = false;
    };
  }, [load]);

  async function createRun(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    try {
      await organizationApi.createRun(workspaceId, projectId, title);
      setTitle('');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to record run.');
    }
  }

  async function createHandoff(run: Run) {
    try {
      await organizationApi.createHandoff(
        workspaceId,
        projectId,
        run.id,
        `Handoff for ${run.title}`,
      );
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create handoff.');
    }
  }

  async function saveHandoff(event: FormEvent, handoff: Handoff) {
    event.preventDefault();
    const values = new FormData(event.currentTarget as HTMLFormElement);
    setBusyHandoffId(handoff.id);
    try {
      await organizationApi.updateHandoff(workspaceId, projectId, handoff.id, {
        expected_version: handoff.version,
        summary: String(values.get('summary') ?? ''),
        next_actions: String(values.get('next_actions') ?? ''),
      });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update handoff.');
    } finally {
      setBusyHandoffId(null);
    }
  }

  async function readyHandoff(handoff: Handoff) {
    setBusyHandoffId(handoff.id);
    try {
      await organizationApi.readyHandoff(workspaceId, projectId, handoff.id, handoff.version);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to make handoff ready.');
    } finally {
      setBusyHandoffId(null);
    }
  }

  async function acknowledgeHandoff(event: FormEvent, handoff: Handoff) {
    event.preventDefault();
    const values = new FormData(event.currentTarget as HTMLFormElement);
    if (!handoff.current_revision) return;
    setBusyHandoffId(handoff.id);
    try {
      await organizationApi.acknowledgeHandoff(
        workspaceId,
        projectId,
        handoff.id,
        handoff.current_revision,
        String(values.get('acknowledged_by') ?? ''),
      );
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to acknowledge handoff.');
    } finally {
      setBusyHandoffId(null);
    }
  }

  return {
    acknowledgeHandoff,
    busyHandoffId,
    createHandoff,
    createRun,
    error,
    handoffs,
    load,
    loading,
    readyHandoff,
    revisions,
    runs,
    saveHandoff,
    setTitle,
    title,
  };
}
