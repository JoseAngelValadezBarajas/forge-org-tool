import { Link } from 'react-router-dom';
import { AlertV2, ButtonV2, CardV2 } from '@corefoundry-labs/forge-ui';
import type { Feature } from '@forge-org/api-client';
import styles from '../FeatureDetailPage.module.css';
import { titleCase, type FeatureDetailModel } from './model';

type Props = Pick<
  FeatureDetailModel,
  | 'attachments'
  | 'attachmentUrls'
  | 'workspaceId'
  | 'projectId'
  | 'featureId'
  | 'archived'
  | 'removeAttachment'
  | 'bugScreenshotInput'
  | 'chooseBugScreenshot'
  | 'uploadAttachment'
  | 'screenshotPickerError'
  | 'selectedTags'
  | 'epicName'
> & { feature: Feature };

export function BugEvidence({
  feature,
  attachments,
  attachmentUrls,
  workspaceId,
  projectId,
  featureId,
  archived,
  removeAttachment,
  bugScreenshotInput,
  chooseBugScreenshot,
  uploadAttachment,
  screenshotPickerError,
  selectedTags,
  epicName,
}: Props) {
  return (
    <>
      <CardV2
        variant="outlined"
        as="section"
        aria-label="Screenshots"
        className={styles.screenshotsCard}
      >
        <h2>
          Screenshots{' '}
          <span className={styles.count}>
            · {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
          </span>
        </h2>
        {attachments.length === 0 ? (
          <p>No screenshots attached.</p>
        ) : (
          <ul className={styles.attachmentGrid}>
            {attachments.map((attachment) => {
              const contentUrl =
                attachmentUrls[attachment.id] ??
                `/api/v1/workspaces/${workspaceId}/projects/${projectId}/features/${featureId}/attachments/${attachment.id}/content`;
              return (
                <li key={attachment.id} className={styles.attachment}>
                  <a href={contentUrl} target="_blank" rel="noreferrer">
                    <img src={contentUrl} alt={`Bug screenshot: ${attachment.file_name}`} />
                    <span>{attachment.file_name}</span>
                  </a>
                  {!archived && (
                    <ButtonV2 variant="ghost" onClick={() => void removeAttachment(attachment.id)}>
                      Remove {attachment.file_name}
                    </ButtonV2>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardV2>
      <CardV2
        variant="outlined"
        as="section"
        aria-label="Attach another screenshot"
        className={styles.uploadCard}
      >
        <h2>Attach another screenshot</h2>
        <p>PNG, JPG or WebP · up to 5 MB</p>
        {!archived && (
          <ButtonV2
            variant="secondary"
            className={styles.chooseImage}
            aria-label="Add Bug screenshot"
            disabled={attachments.length >= 5}
            onClick={() => void chooseBugScreenshot()}
          >
            + Choose image
          </ButtonV2>
        )}
        <input
          ref={bugScreenshotInput}
          className={styles.visuallyHidden}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label="Choose Bug screenshot"
          disabled={attachments.length >= 5 || archived}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file) void uploadAttachment(file);
            event.currentTarget.value = '';
          }}
        />
        {screenshotPickerError && <AlertV2 tone="error">{screenshotPickerError}</AlertV2>}
      </CardV2>
      <CardV2
        variant="outlined"
        as="section"
        aria-label="Properties"
        className={styles.bugProperties}
      >
        <h2>
          {selectedTags.join(', ') || 'Bug'} · {titleCase(feature.priority)}
        </h2>
        <p>
          <span>{titleCase(feature.status)}</span> · Severity:{' '}
          <span>{titleCase(feature.bug_severity)}</span>
        </p>
        {feature.epic_id && (
          <Link to={`/planning/${workspaceId}/${projectId}/epics/${feature.epic_id}`}>
            {epicName}
          </Link>
        )}
      </CardV2>
    </>
  );
}
