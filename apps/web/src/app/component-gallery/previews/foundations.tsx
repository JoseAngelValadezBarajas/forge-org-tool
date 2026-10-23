import { Card } from '@forge-org/ui';
import styles from '../ComponentGallery.module.css';

export function TokenPreview() {
  const primitiveTokens = [
    'palette-graphite-950',
    'palette-graphite-900',
    'palette-graphite-800',
    'palette-graphite-700',
    'palette-copper-500',
    'palette-copper-700',
    'palette-success-400',
    'palette-success-700',
    'palette-warning-400',
    'palette-warning-700',
    'palette-danger-400',
    'palette-danger-700',
    'palette-info-400',
    'palette-info-700',
  ];
  return (
    <Card>
      <h4>Semantic theme tokens</h4>
      <div className={styles.tokenGrid} aria-label="Semantic token preview">
        {['bg', 'surface', 'surface-raised', 'text', 'accent', 'success', 'warning', 'danger'].map(
          (token) => (
            <div className={styles.token} key={token}>
              <span
                className={styles.swatch}
                style={{ background: `var(--forge-${token})` }}
                aria-hidden="true"
              />
              <code>--forge-{token}</code>
            </div>
          ),
        )}
      </div>
      <h4>Primitive palette samples</h4>
      <div className={styles.tokenGrid} aria-label="Primitive palette preview">
        {primitiveTokens.map((token) => (
          <div className={styles.token} key={token}>
            <span
              className={styles.swatch}
              style={{ background: `var(--forge-${token})` }}
              aria-hidden="true"
            />
            <code>--forge-{token}</code>
          </div>
        ))}
      </div>
    </Card>
  );
}
