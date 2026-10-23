import { Card, StatusChip } from '@forge-org/ui';
import styles from './RuleCard.module.css';

export interface RuleCardProps {
  ruleId: string;
  result: string;
  explanation: string;
}

export function RuleCard({ ruleId, result, explanation }: RuleCardProps) {
  const tone = result === 'PASS' || result === 'PASSED' ? 'success' : 'warning';
  return (
    <Card className={styles.rule}>
      <article aria-label={ruleId}>
        <header>
          <code>{ruleId}</code>
          <StatusChip tone={tone}>{result}</StatusChip>
        </header>
        <p>{explanation}</p>
      </article>
    </Card>
  );
}
