import { Link } from 'react-router-dom';
import styles from '../App.module.css';
import { getProjectContext } from './navigationContext';

export function Breadcrumbs({
  pathname,
  isMobileEpicBoard,
  workspaceName,
  projectName,
}: {
  pathname: string;
  isMobileEpicBoard: boolean;
  workspaceName?: string;
  projectName?: string;
}) {
  if (pathname === '/workspaces/manage') {
    return (
      <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
        <ol>
          <li>
            <Link to="/">Workspace</Link>
          </li>
          <li>
            <span aria-current="page">Manage workspaces</span>
          </li>
        </ol>
      </nav>
    );
  }
  if (pathname.startsWith('/workspaces/')) {
    return (
      <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
        <ol>
          <li>
            <Link to="/">Workspace</Link>
          </li>
          <li>
            <span aria-current="page">Settings</span>
          </li>
        </ol>
      </nav>
    );
  }
  const context = getProjectContext(pathname);
  if (!context) return null;
  const parts = pathname.split('/').filter(Boolean);
  const section = parts[0];
  const [, , , fourth] = parts;
  const isEpic = section === 'planning' && fourth === 'epics';
  const isWorkItem = section === 'planning' && fourth === 'features';
  const crumbs = [
    { label: isMobileEpicBoard ? (workspaceName ?? 'Workspace') : 'Workspace', href: '/' },
    {
      label: isMobileEpicBoard ? (projectName ?? 'Project') : 'Project board',
      href: `/planning/${context.workspaceId}/${context.projectId}`,
    },
  ];
  if (section === 'planning' && !fourth) crumbs.pop();
  const currentLabel =
    section === 'projects'
      ? 'Overview'
      : isWorkItem
        ? 'Story / Bug'
        : isEpic
          ? 'Epic'
          : section === 'transfer'
            ? 'Transfer'
            : 'Project board';
  if (crumbs.at(-1)?.label !== currentLabel) crumbs.push({ label: currentLabel, href: '' });
  return (
    <nav
      aria-label="Breadcrumb"
      className={`${styles.breadcrumb} ${isMobileEpicBoard ? styles.mobileEpicBreadcrumb : ''}`}
      data-node-id={isMobileEpicBoard ? '348:216' : undefined}
    >
      <ol>
        {crumbs.map((crumb, index) => (
          <li key={`${crumb.label}-${index}`}>
            {crumb.href ? (
              <Link to={crumb.href}>{crumb.label}</Link>
            ) : (
              <span aria-current="page">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
