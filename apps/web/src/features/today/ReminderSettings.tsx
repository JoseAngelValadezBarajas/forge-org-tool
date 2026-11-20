import { ButtonV2, SwitchV2, TextInputV2 } from '@corefoundry-labs/forge-ui';
import styles from './ReminderSettings.module.css';
import { useReminderSettings } from './useReminderSettings';

/** One row on Today: a daily digest of what is due, off until the user turns it on. */
export function ReminderSettings() {
  const { available, delivery, preferences, message, setEnabled, setTime, sendTest } =
    useReminderSettings();
  if (!available) return null;

  return (
    <section className={styles.row} aria-label="Reminders">
      <SwitchV2
        checked={preferences.enabled}
        onChange={(event) => void setEnabled(event.target.checked)}
      >
        Remind me each morning
      </SwitchV2>
      {preferences.enabled && (
        <>
          <TextInputV2
            size="sm"
            type="time"
            className={styles.time}
            aria-label="Reminder time"
            value={preferences.time}
            onChange={(event) => setTime(event.target.value)}
          />
          <ButtonV2 variant="ghost" size="sm" onClick={() => void sendTest()}>
            Send a test
          </ButtonV2>
        </>
      )}
      {preferences.enabled && delivery === 'scheduled' && (
        <span className={styles.message}>
          Android shows it at about this time, even with the app closed. It cannot include counts,
          because the phone shows it without opening FORGE.
        </span>
      )}
      {message && (
        <span className={styles.message} role="status">
          {message}
        </span>
      )}
    </section>
  );
}
