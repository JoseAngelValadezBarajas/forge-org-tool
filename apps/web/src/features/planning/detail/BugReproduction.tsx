import { CardV2 } from '@corefoundry-labs/forge-ui';
import type { Feature } from '@forge-org/api-client';
import styles from '../FeatureDetailPage.module.css';

export function BugReproduction({ feature }: { feature: Feature }) {
  return (
    <>
      <CardV2
        variant="outlined"
        as="section"
        aria-label="How to reproduce"
        className={styles.reproduction}
      >
        <h2>How to reproduce</h2>
        {feature.steps_to_reproduce ? (
          <ol className={styles.steps}>
            {feature.steps_to_reproduce
              .split('\n')
              .filter((line: string) => line.trim())
              .map((step: string, index: number) => (
                <li key={index}>{step.replace(/^\s*\d+[.)]\s*/, '')}</li>
              ))}
          </ol>
        ) : (
          <p>Not provided.</p>
        )}
        {feature.description && <p>{feature.description}</p>}
        {feature.goal && (
          <section>
            <h3>Goal</h3>
            <p>{feature.goal}</p>
          </section>
        )}
      </CardV2>
      <div className={styles.resultGrid}>
        <CardV2
          variant="outlined"
          as="section"
          aria-label="Actual result"
          className={styles.actual}
        >
          <h2>Actual result</h2>
          <p>{feature.actual_result || 'Not provided.'}</p>
        </CardV2>
        <CardV2
          variant="outlined"
          as="section"
          aria-label="Expected result"
          className={styles.expected}
        >
          <h2>Expected result</h2>
          <p>{feature.expected_result || 'Not provided.'}</p>
        </CardV2>
      </div>
    </>
  );
}
