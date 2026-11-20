import { Link } from 'react-router-dom';
import {
  AlertV2,
  BadgeV2,
  ButtonV2,
  CardV2,
  CheckboxV2,
  FeedbackStateV2,
  TextInputV2,
} from '@corefoundry-labs/forge-ui';
import { OrganizeDialog } from './OrganizeDialog';
import { ReminderSettings } from './ReminderSettings';
import styles from './TodayPage.module.css';
import { dueLabel, TODAY_SECTIONS, type TodayItem } from './todayModel';
import { useTodayController } from './useTodayController';

export function TodayPage() {
  const {
    loading,
    error,
    text,
    setText,
    saving,
    preview,
    groups,
    todayIso,
    attention,
    openCount,
    showProject,
    inboxName,
    notice,
    dismissNotice,
    undoCompletion,
    captureRef,
    submitCapture,
    complete,
    changeDueDate,
    moveOverdueToToday,
    projects,
    epicsByProject,
    organizing,
    organizeError,
    organizeSaving,
    openOrganize,
    closeOrganize,
    saveOrganize,
    retry,
  } = useTodayController();

  const heading = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  if (loading) {
    return (
      <CardV2 variant="outlined">
        <FeedbackStateV2 state="loading" title="Loading Today…" />
      </CardV2>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>{heading}</p>
        <h1>Today</h1>
        <p className={styles.summary}>
          {attention > 0
            ? `${attention} need${attention === 1 ? 's' : ''} your attention`
            : openCount > 0
              ? 'Nothing is due today'
              : 'You are all caught up'}
        </p>
      </header>

      <form className={styles.capture} onSubmit={submitCapture} aria-label="Quick capture">
        <TextInputV2
          ref={captureRef}
          size="lg"
          aria-label="Capture a task"
          placeholder='Add a task, e.g. "Fix login friday" (press n)'
          value={text}
          onChange={(event) => setText(event.target.value)}
          autoComplete="off"
        />
        <ButtonV2 type="submit" loading={saving} disabled={!preview.title}>
          Add
        </ButtonV2>
        {preview.dueDate && (
          <span className={styles.preview} aria-live="polite">
            <BadgeV2 tone="info" variant="subtle">
              Due {dueLabel(preview.dueDate, todayIso)}
            </BadgeV2>
            <span>{preview.title}</span>
          </span>
        )}
      </form>

      <ReminderSettings />

      {error && (
        <AlertV2 tone="error">
          {error}{' '}
          <ButtonV2 variant="ghost" size="sm" onClick={retry}>
            Retry
          </ButtonV2>
        </AlertV2>
      )}

      {notice && (
        <div className={styles.notice} role="status">
          <span>{notice.message}</span>
          {notice.undo && (
            <ButtonV2
              variant="ghost"
              size="sm"
              onClick={() => {
                const { item } = notice.undo!;
                undoCompletion(item);
              }}
            >
              Undo
            </ButtonV2>
          )}
          <ButtonV2 variant="ghost" size="sm" aria-label="Dismiss message" onClick={dismissNotice}>
            ×
          </ButtonV2>
        </div>
      )}

      {openCount === 0 ? (
        <CardV2 variant="outlined">
          <FeedbackStateV2
            state="empty"
            title="Nothing to do yet"
            description={`Type a task above and press Enter. It lands in ${inboxName}; add a day like “friday” or “in 3 days” to give it a deadline.`}
          />
        </CardV2>
      ) : (
        TODAY_SECTIONS.map(({ id, title }) => {
          const section = groups[id];
          if (section.length === 0) return null;
          return (
            <section key={id} className={styles.section} aria-labelledby={`today-${id}`}>
              <h2 id={`today-${id}`} data-tone={id}>
                {title} <span className={styles.count}>{section.length}</span>
                {id === 'overdue' && (
                  <ButtonV2 variant="ghost" size="sm" onClick={moveOverdueToToday}>
                    Move all to today
                  </ButtonV2>
                )}
              </h2>
              <ul className={styles.list}>
                {section.map((item) => (
                  <TaskRow
                    key={`${item.projectId}:${item.feature.id}`}
                    item={item}
                    todayIso={todayIso}
                    showProject={showProject}
                    onComplete={complete}
                    onChangeDate={changeDueDate}
                    onOrganize={openOrganize}
                  />
                ))}
              </ul>
            </section>
          );
        })
      )}

      {organizing && (
        <OrganizeDialog
          key={`${organizing.projectId}:${organizing.feature.id}`}
          item={organizing}
          projects={projects}
          epicsByProject={epicsByProject}
          saving={organizeSaving}
          error={organizeError}
          onSave={(values) => saveOrganize(organizing, values)}
          onClose={closeOrganize}
        />
      )}
    </div>
  );
}

function TaskRow({
  item,
  todayIso,
  showProject,
  onComplete,
  onChangeDate,
  onOrganize,
}: {
  item: TodayItem;
  todayIso: string;
  showProject: boolean;
  onComplete: (item: TodayItem) => void;
  onChangeDate: (item: TodayItem, dueDate: string | null) => void;
  onOrganize: (item: TodayItem) => void;
}) {
  const { feature } = item;
  return (
    <li className={styles.row}>
      <CheckboxV2
        aria-label={`Complete ${feature.title}`}
        checked={false}
        onChange={() => onComplete(item)}
      />
      <Link
        className={styles.title}
        to={`/planning/${item.workspaceId}/${item.projectId}/features/${feature.id}`}
      >
        {feature.title}
      </Link>
      <div className={styles.meta}>
        {feature.kind === 'bug' && (
          <BadgeV2 tone="error" variant="subtle" size="sm">
            Bug
          </BadgeV2>
        )}
        {showProject && (
          <BadgeV2 tone="neutral" variant="outline" size="sm">
            {item.projectName}
          </BadgeV2>
        )}
        <span
          className={styles.due}
          data-overdue={!!feature.due_date && feature.due_date < todayIso}
        >
          {dueLabel(feature.due_date, todayIso)}
        </span>
        {!!feature.due_date && feature.due_date < todayIso && (
          <ButtonV2
            variant="ghost"
            size="sm"
            aria-label={`Move ${feature.title} to today`}
            onClick={() => onChangeDate(item, todayIso)}
          >
            Move to today
          </ButtonV2>
        )}
        <ButtonV2
          variant="ghost"
          size="sm"
          aria-label={`Organize ${feature.title}`}
          onClick={() => onOrganize(item)}
        >
          Organize
        </ButtonV2>
        <TextInputV2
          size="sm"
          type="date"
          className={styles.dateInput}
          aria-label={`Due date for ${feature.title}`}
          value={feature.due_date ?? ''}
          onChange={(event) => onChangeDate(item, event.target.value || null)}
        />
      </div>
    </li>
  );
}
