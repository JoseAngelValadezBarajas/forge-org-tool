import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  FormField,
  Input,
  SearchField,
  SectionHeader,
  Select,
  StatusChip,
} from '@forge-org/ui';
import styles from './DeliveryPage.module.css';
import { DeliverySummary } from './DeliverySummary';
import { useDeliveryController } from './useDeliveryController';
import { DownloadAction, ReleaseGate, TrustDisclosure, VerificationSummary } from './components';

export function DeliveryPage() {
  const { workspaceId = '', projectId = '' } = useParams();
  const controller = useDeliveryController(workspaceId, projectId);
  const [expandedEvidenceId, setExpandedEvidenceId] = useState<string | null>(null);
  const {
    addCandidate,
    addEvidence,
    candidateHistory,
    candidateSummary,
    candidateTitle,
    candidates,
    error,
    evidence,
    evidenceSummary,
    evidenceTitle,
    freezeCandidate,
    gate,
    gateHistory,
    invalidateEvidence,
    load,
    manifest,
    previewGates,
    previewVerification,
    provenance,
    rules,
    search,
    selectedCandidateId,
    selectedRuleId,
    setCandidateSummary,
    setCandidateTitle,
    setEvidenceSummary,
    setEvidenceTitle,
    setProvenance,
    setSearch,
    setSelectedRuleId,
    setStatus,
    status,
    updateCandidate,
    evaluateGates,
    evaluateVerification,
    verification,
    verifications,
    saveManifest,
    selectCandidate,
    setVerification,
  } = controller;
  const downloadPath = (format: 'json' | 'markdown') =>
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/release-candidates/${selectedCandidateId}/manifest/download?format=${format}`;
  const selectedCandidate = candidates.find((item) => item.id === selectedCandidateId);

  return (
    <div className={styles.stack}>
      <SectionHeader title="Delivery overview" eyebrow="FORGE / Truth states" />
      <TrustDisclosure>
        Evidence provenance and gates are explicit. A blocked gate is not a publication or
        deployment claim.
      </TrustDisclosure>
      {error && <p role="alert">{error}</p>}
      <DeliverySummary
        evidenceCount={evidence.length}
        candidateCount={candidates.length}
        ruleCount={rules.length}
      />
      <nav className={styles.workflowNav} aria-label="Delivery workflows">
        <a href="#delivery-evidence">Evidence detail &amp; provenance</a>
        <a href="#delivery-verification">Verification center</a>
        <a href="#delivery-candidate-create">Create candidate</a>
        <a href="#delivery-candidates">Release candidates &amp; manifest</a>
        <a href="#delivery-gates">Release gate evaluation</a>
      </nav>
      <Card>
        <h2>Delivery verification</h2>
        <p>Candidate checks are deterministic and retained with their input fingerprint.</p>
        <StatusChip tone="warning">NOT_PUBLISHED</StatusChip>
        <p>Manifests are planning artifacts only, not a deployment or publication.</p>
      </Card>
      <div className={styles.forms}>
        <Card>
          <form id="delivery-evidence-create" onSubmit={addEvidence}>
            <h3>Reported evidence</h3>
            <Input
              aria-label="Evidence title"
              value={evidenceTitle}
              onChange={(event) => setEvidenceTitle(event.target.value)}
              placeholder="Title"
            />
            <Input
              aria-label="Evidence summary"
              value={evidenceSummary}
              onChange={(event) => setEvidenceSummary(event.target.value)}
              placeholder="Summary"
            />
            <Button type="submit">Record Evidence</Button>
          </form>
        </Card>
        <Card>
          <form id="delivery-candidate-create" onSubmit={addCandidate}>
            <h3>Release candidate</h3>
            <Input
              aria-label="New candidate title"
              value={candidateTitle}
              onChange={(event) => setCandidateTitle(event.target.value)}
              placeholder="Title"
            />
            <Input
              aria-label="New candidate summary"
              value={candidateSummary}
              onChange={(event) => setCandidateSummary(event.target.value)}
              placeholder="Summary"
            />
            <Button type="submit">Create Candidate</Button>
          </form>
        </Card>
      </div>
      <Card id="delivery-evidence">
        <h3>Evidence inventory</h3>
        <div className={styles.filters}>
          <SearchField
            aria-label="Evidence search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search evidence"
          />
          <FormField label="Evidence provenance">
            <Select
              aria-label="Evidence provenance"
              value={provenance}
              onChange={(event) => setProvenance(event.target.value)}
            >
              <option value="">All provenance</option>
              <option value="REPORTED">REPORTED</option>
              <option value="OBSERVED">OBSERVED</option>
              <option value="VERIFIED">VERIFIED</option>
              <option value="UNKNOWN">UNKNOWN</option>
            </Select>
          </FormField>
          <FormField label="Evidence status">
            <Select
              aria-label="Evidence status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">All status</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INVALIDATED">INVALIDATED</option>
            </Select>
          </FormField>
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Apply evidence filters
          </Button>
        </div>
        {evidence.length === 0 ? (
          <p>No evidence records.</p>
        ) : (
          evidence.map((item) => (
            <article className={styles.item} key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <p>{item.summary}</p>
              </div>
              <div>
                <StatusChip tone="accent">
                  {item.provenance} / {item.status}
                </StatusChip>
                <div className={styles.provenanceDetails}>
                  <Link to={`/delivery/${workspaceId}/${projectId}/evidence/${item.id}`}>
                    Open evidence detail
                  </Link>
                  <button
                    type="button"
                    className={styles.provenanceToggle}
                    aria-expanded={expandedEvidenceId === item.id}
                    aria-controls={`evidence-details-${item.id}`}
                    onClick={() =>
                      setExpandedEvidenceId(expandedEvidenceId === item.id ? null : item.id)
                    }
                  >
                    Evidence detail &amp; provenance
                  </button>
                  {expandedEvidenceId === item.id && (
                    <div id={`evidence-details-${item.id}`}>
                      <dl>
                        <dt>Provenance</dt>
                        <dd>{item.provenance}</dd>
                        <dt>Evidence ID</dt>
                        <dd className={styles.longValue}>{item.id}</dd>
                        <dt>Related feature</dt>
                        <dd>{item.feature_id ?? 'No feature linked'}</dd>
                        <dt>Record status</dt>
                        <dd>{item.status}</dd>
                        <dt>Reference type</dt>
                        <dd>{item.reference_kind}</dd>
                        <dt>Declared reference</dt>
                        <dd className={styles.longValue}>{item.reference_value}</dd>
                        <dt>Summary</dt>
                        <dd>{item.summary}</dd>
                        <dt>Record created</dt>
                        <dd>
                          <time dateTime={item.created_at}>
                            {new Date(item.created_at).toLocaleString()}
                          </time>
                        </dd>
                      </dl>
                      {item.provenance === 'REPORTED' && (
                        <p>A reported reference is not an independently verified result.</p>
                      )}
                    </div>
                  )}
                </div>
                {item.status === 'ACTIVE' && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void invalidateEvidence(item)}
                    aria-label={`Invalidate ${item.title}`}
                  >
                    Invalidate
                  </Button>
                )}
              </div>
            </article>
          ))
        )}
      </Card>
      <Card id="delivery-candidates">
        <h3>Release candidates &amp; manifest</h3>
        {candidates.length === 0 ? (
          <p>No candidates.</p>
        ) : (
          candidates.map((item) => (
            <article className={styles.item} key={item.id}>
              <div>
                {item.status === 'DRAFT' ? (
                  <form
                    onSubmit={(event) => void updateCandidate(event, item)}
                    className={styles.form}
                  >
                    <Input name="title" aria-label="Candidate title" defaultValue={item.title} />
                    <Input
                      name="summary"
                      aria-label="Candidate summary"
                      defaultValue={item.summary}
                    />
                    <Button type="submit">Save candidate</Button>
                  </form>
                ) : (
                  <strong>{item.title}</strong>
                )}
                <p>{item.summary}</p>
                <StatusChip tone={item.status === 'FROZEN' ? 'warning' : 'neutral'}>
                  {item.status}
                </StatusChip>
                <small>
                  Revision {item.revision}
                  {item.fingerprint ? ` · ${item.fingerprint}` : ''}
                </small>
              </div>
              <div className={styles.actions}>
                <Link to={`/delivery/${workspaceId}/${projectId}/candidates/${item.id}`}>
                  Candidate detail &amp; history
                </Link>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void selectCandidate(item.id)}
                  aria-label={`Inspect candidate ${item.title}`}
                >
                  Inspect candidate
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void previewGates(item.id)}
                  aria-label={`Preview gates for ${item.title}`}
                >
                  Preview gates
                </Button>
                {item.status === 'DRAFT' && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void freezeCandidate(item)}
                    aria-label={`Freeze ${item.title}`}
                  >
                    Freeze
                  </Button>
                )}
              </div>
            </article>
          ))
        )}
      </Card>
      {selectedCandidate && (
        <Card id="delivery-candidates-history">
          <h3>Candidate history</h3>
          {candidateHistory.length === 0 ? (
            <p>No candidate revisions.</p>
          ) : (
            candidateHistory.map((item) => (
              <p key={item.id}>
                Revision {item.revision}: {item.status} · {item.fingerprint}
              </p>
            ))
          )}
          <h3>Gate history</h3>
          {gateHistory.length === 0 ? (
            <p>No gate evaluations.</p>
          ) : (
            gateHistory.map((item) => (
              <p key={item.id}>
                {item.outcome} · {item.input_fingerprint}
              </p>
            ))
          )}
        </Card>
      )}
      <Card id="delivery-verification">
        <h3>Verification center</h3>
        <p>Each deterministic result applies only to its named rule and recorded inputs.</p>
        <FormField label="Verification rule">
          <Select
            aria-label="Verification rule"
            value={selectedRuleId}
            onChange={(event) => setSelectedRuleId(event.target.value)}
          >
            {rules.map((rule) => (
              <option key={rule.id} value={rule.id}>
                {rule.label}
              </option>
            ))}
          </Select>
        </FormField>
        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={() => void previewVerification()}>
            Preview verification
          </Button>
          <Button type="button" onClick={() => void evaluateVerification()}>
            Evaluate verification
          </Button>
        </div>
        {verification && (
          <div className={styles.result}>
            <h4>Verification result &amp; trace</h4>
            <p>
              Rule:{' '}
              {rules.find((rule) => rule.id === verification.rule_id)?.label ??
                verification.rule_id}
            </p>
            <VerificationSummary
              outcome={verification.outcome}
              fingerprint={verification.input_fingerprint}
              stale={verification.stale}
              blockers={verification.blockers}
            />
          </div>
        )}
        {verifications.length > 0 && (
          <section aria-labelledby="verification-history-title">
            <h4 id="verification-history-title">Saved verification results</h4>
            {verifications.map((item) => (
              <article className={styles.verificationHistory} key={item.id ?? item.rule_id}>
                <p>
                  {item.rule_id}: {item.outcome}
                  {item.stale ? ' / STALE' : ''}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setVerification(item)}
                  aria-label={`Inspect saved verification for ${item.rule_id}`}
                >
                  Inspect result
                </Button>
                {item.id && (
                  <Link to={`/delivery/${workspaceId}/${projectId}/verifications/${item.id}`}>
                    Open verification result
                  </Link>
                )}
              </article>
            ))}
          </section>
        )}
      </Card>
      {selectedCandidate && (
        <div id="delivery-gates">
          <h3>Release gate evaluation</h3>
          <ReleaseGate outcome={gate?.outcome ?? 'NOT_EVALUATED'}>
            {gate ? (
              <>
                <p className={styles.longValue}>Input fingerprint: {gate.input_fingerprint}</p>
                {gate.blockers.map((blocker) => (
                  <p key={blocker}>{blocker}</p>
                ))}
                <div className={styles.actions}>
                  <Button type="button" variant="secondary" onClick={() => void evaluateGates()}>
                    Evaluate gates
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void saveManifest()}
                    disabled={gate.outcome !== 'PASS' || !gate.id}
                  >
                    Save NOT_PUBLISHED manifest
                  </Button>
                </div>
              </>
            ) : (
              <p>Select Preview gates to inspect this candidate.</p>
            )}
          </ReleaseGate>
        </div>
      )}
      {manifest && (
        <Card>
          <h3>Manifest</h3>
          <StatusChip tone="warning">{manifest.status}</StatusChip>
          <p>
            {manifest.schema_version} / {manifest.fingerprint}
          </p>
          <p>{manifest.markdown}</p>
          <div className={styles.actions}>
            <DownloadAction label="JSON" href={downloadPath('json')} />
            <DownloadAction label="Markdown" href={downloadPath('markdown')} />
          </div>
        </Card>
      )}
    </div>
  );
}
