import { useEffect, useState } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import { Button } from '@forge-org/ui';
import { OrganizationPage } from '../features/organization';
import { FeatureDetailPage, PlanningPage } from '../features/planning';
import { ReadinessPage } from '../features/readiness';
import { WorkbenchPage } from '../features/workbench';
import { DeliveryPage } from '../features/delivery';
import { RepositoriesPage } from '../features/repositories';
import { ContextPage } from '../features/context';
import { TransferPage } from '../features/transfer';
import { ComponentGallery } from './component-gallery/ComponentGallery';
import styles from './App.module.css';
export function App() {
  const navigate = useNavigate();
  const [light, setLight] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setPaletteOpen(true); }
      if (event.key === 'Escape') setPaletteOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  function go(path: string) { setPaletteOpen(false); navigate(path); }
  return <div className={styles.app} data-testid="application-shell" data-theme={light ? 'light' : 'dark'}>
    <header className={styles.topbar}><Link to="/" className={styles.brand}>FORGE <span>Org Tool</span></Link>
      <nav aria-label="Primary"><Link to="/">Organization</Link>{import.meta.env.DEV && <Link to="/__components">Component host</Link>}<Button variant="ghost" onClick={() => setPaletteOpen(true)} aria-label="Open command palette">Command palette</Button><Button variant="ghost" onClick={() => setLight((value) => !value)} aria-label={`Switch to ${light ? 'dark' : 'light'} theme`}>Theme: {light ? 'light' : 'dark'}</Button></nav>
    </header>
    <main id="main" className={styles.main}>
      <Routes>
        <Route path="/" element={<OrganizationPage />} />
        <Route path="/planning/:workspaceId/:projectId" element={<PlanningPage />} />
        <Route path="/planning/:workspaceId/:projectId/features/:featureId" element={<FeatureDetailPage />} />
        <Route path="/readiness/:workspaceId/:projectId/:featureId" element={<ReadinessPage />} />
        <Route path="/workbench/:workspaceId/:projectId" element={<WorkbenchPage />} />
        <Route path="/delivery/:workspaceId/:projectId" element={<DeliveryPage />} />
        <Route path="/repositories/:workspaceId/:projectId" element={<RepositoriesPage />} />
        <Route path="/context/:workspaceId/:projectId/:featureId" element={<ContextPage />} />
        <Route path="/transfer/:workspaceId/:projectId" element={<TransferPage />} />
        {import.meta.env.DEV && <Route path="/__components" element={<ComponentGallery />} />}
        <Route path="*" element={<p>Page not found.</p>} />
      </Routes>
    </main>
    {paletteOpen && <div className={styles.paletteBackdrop} role="presentation" onMouseDown={() => setPaletteOpen(false)}><div className={styles.palette} role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(event) => event.stopPropagation()}><h2>Command palette</h2><Button variant="ghost" onClick={() => go('/')} aria-label="Go to Organization">Organization</Button>{import.meta.env.DEV && <Button variant="ghost" onClick={() => go('/__components')}>Component host</Button>}<p>Press Escape to close.</p></div></div>}
  </div>;
}
