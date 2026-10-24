import { Card } from '@corefoundry-labs/forge-ui';
import styles from '../ComponentGallery.module.css';
import { iconCatalog } from '../catalog/icons';

export function IconCatalogPreview() {
  return (
    <Card>
      <div className={styles.iconGrid}>
        {iconCatalog.map(([name, Icon]) => (
          <div
            className={styles.iconItem}
            data-component-id={`icon-${name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`}
            data-icon-name={name}
            key={name}
          >
            <Icon size={20} />
            <span>{name}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
