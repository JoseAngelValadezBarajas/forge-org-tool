import { Link, Route, Routes } from 'react-router-dom';
import { OrganizationPage } from '../features/organization';
import { PlanningPage } from '../features/planning';
import { ComponentGallery } from './component-gallery/ComponentGallery';
import styles from './App.module.css';
export function App() {
  return <div className={styles.app} data-theme="dark">
    <header className={styles.topbar}><Link to="/" className={styles.brand}>FORGE <span>Org Tool</span></Link>
      <nav aria-label="Primary"><Link to="/">Organization</Link>{import.meta.env.DEV && <Link to="/__components">Component host</Link>}</nav>
    </header>
    <main id="main" className={styles.main}>
      <Routes>
        <Route path="/" element={<OrganizationPage />} />
        <Route path="/planning/:workspaceId/:projectId" element={<PlanningPage />} />
        {import.meta.env.DEV && <Route path="/__components" element={<ComponentGallery />} />}
        <Route path="*" element={<p>Page not found.</p>} />
      </Routes>
    </main>
  </div>;
}
