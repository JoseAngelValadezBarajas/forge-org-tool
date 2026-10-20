import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, Input, SectionHeader, StatusChip } from '@forge-org/ui';
import { organizationApi, type Criterion, type Dependency, type Task } from '@forge-org/api-client';
import styles from './PlanningPage.module.css';

export function FeatureDetailPage() {
  const { workspaceId = '', projectId = '', featureId = '' } = useParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [taskTitle, setTaskTitle] = useState('');
  const [criterion, setCriterion] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      const [nextTasks, nextCriteria, nextDependencies] = await Promise.all([
        organizationApi.listTasks(workspaceId, projectId, featureId),
        organizationApi.listCriteria(workspaceId, projectId, featureId),
        organizationApi.listDependencies(workspaceId, projectId),
      ]);
      setTasks(nextTasks); setCriteria(nextCriteria); setDependencies(nextDependencies);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load feature detail.'); }
  }
  useEffect(() => { void load(); }, [workspaceId, projectId, featureId]);
  async function addTask(event: FormEvent) { event.preventDefault(); if (!taskTitle.trim()) return; try { await organizationApi.createTask(workspaceId, projectId, featureId, taskTitle); setTaskTitle(''); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to add task.'); } }
  async function addCriterion(event: FormEvent) { event.preventDefault(); if (!criterion.trim()) return; try { await organizationApi.createCriterion(workspaceId, projectId, featureId, criterion); setCriterion(''); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to add criterion.'); } }
  async function changeTask(task: Task, status: Task['status']) { try { await organizationApi.updateTask(workspaceId, projectId, featureId, task.id, { status }); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update task.'); } }
  return <div className={styles.stack}>
    <SectionHeader title="Feature detail" eyebrow="FORGE / Manual planning" />
    <p>Tasks, criteria, and dependencies are planning records only; status changes do not claim execution or delivery.</p>
    {error && <p role="alert">{error}</p>}
    <p><Link to={`/planning/${workspaceId}/${projectId}`}>Back to planning board</Link></p>
    <div className={styles.forms}><Card><form onSubmit={addTask}><label htmlFor="task-title">Task title</label><Input id="task-title" aria-label="Task title" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} required /><Button type="submit">Add task</Button></form></Card><Card><form onSubmit={addCriterion}><label htmlFor="criterion-title">Acceptance criterion</label><Input id="criterion-title" aria-label="Acceptance criterion" value={criterion} onChange={(event) => setCriterion(event.target.value)} required /><Button type="submit">Add criterion</Button></form></Card></div>
    <Card><h3>Tasks</h3>{tasks.length === 0 ? <p>No tasks.</p> : tasks.map((task) => <article className={styles.item} key={task.id}><strong>{task.title}</strong><select aria-label={`Status for ${task.title}`} value={task.status} onChange={(event) => void changeTask(task, event.target.value as Task['status'])}><option value="todo">todo</option><option value="in_progress">in_progress</option><option value="done">done</option></select></article>)}</Card>
    <Card><h3>Acceptance criteria</h3>{criteria.length === 0 ? <p>No acceptance criteria.</p> : <ul>{criteria.map((item) => <li key={item.id}><StatusChip tone={item.satisfied ? 'success' : 'neutral'}>{item.satisfied ? 'satisfied' : 'open'}</StatusChip> {item.description}</li>)}</ul>}</Card>
    <Card><h3>Dependencies</h3>{dependencies.length === 0 ? <p>No project dependencies.</p> : <ul>{dependencies.map((item) => <li key={item.id}>{item.blocking_feature_id} blocks {item.blocked_feature_id}</li>)}</ul>}</Card>
  </div>;
}
