import type { ReactNode } from 'react';
import type { CatalogSection } from '../catalog/types';
import styles from '../ComponentGallery.module.css';

export function ComponentGalleryLayout({
  sections,
  children,
}: {
  sections: CatalogSection[];
  children: ReactNode;
}) {
  return (
    <div className={styles.layout}>
      <nav className={styles.catalogNav} aria-label="Component host sections">
        <strong>Catalog</strong>
        {sections.map((section) => (
          <a key={section} href={`#${section.toLowerCase().replaceAll(' ', '-')}`}>
            {section}
          </a>
        ))}
      </nav>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
