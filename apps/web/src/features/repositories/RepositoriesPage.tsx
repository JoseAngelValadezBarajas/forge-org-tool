import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card, Input, SectionHeader, StatusChip } from '@forge-org/ui';
import { organizationApi, type Repository } from '@forge-org/api-client';
import styles from './RepositoriesPage.module.css';

export function RepositoriesPage() {
  const { workspaceId = '', projectId = '' } = useParams();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [rootPath, setRootPath] = useState('');
  const [error, setError] = useState('');
  async function load() {
    try { setRepositories(await organizationApi.listRepositories(workspaceId, projectId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load repositories.'); }
  }
  useEffect(() => { void load(); }, [workspaceId, projectId]);
  async function connect(event: React.FormEvent) {
    event.preventDefault();
    if (!rootPath.trim()) return;
    try { await organizationApi.connectRepository(workspaceId, projectId, rootPath.trim()); setRootPath(''); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to connect repository.'); }
  }
  async function observe(repository: Repository) {
    try { await organizationApi.observeRepository(workspaceId, projectId, repository.id); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to observe repository.'); }
  }
  return <div className={styles.stack}>
    <SectionHeader title="Repositories" eyebrow="FORGE / Metadata-only context" />
    <p>Connections are optional, allowlisted, read-only Git observations. FORGE never reads source content or contacts remotes.</p>
    {error && <p role="alert">{error}</p>}
    <Card><form onSubmit={connect} className={styles.form}><label htmlFor="repository-path">Approved local Git root</label><Input id="repository-path" value={rootPath} onChange={(event) => setRootPath(event.target.value)} placeholder="C:\\approved\\project" required /><Button type="submit">Connect Repository</Button></form></Card>
    <Card><h3>Connections</h3>{repositories.length === 0 ? <p>No repositories connected.</p> : repositories.map((repository) => <article className={styles.item} key={repository.id}><div><StatusChip tone={repository.status === 'connected' ? 'success' : 'neutral'}>{repository.status}</StatusChip><div className={styles.path}>{repository.root_path}</div></div><Button variant="secondary" onClick={() => void observe(repository)}>Observe metadata</Button></article>)}</Card>
  </div>;
}
