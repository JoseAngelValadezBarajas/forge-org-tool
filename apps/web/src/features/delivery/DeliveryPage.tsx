import { useParams } from 'react-router-dom';
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

export function DeliveryPage() {
  const { workspaceId = '', projectId = '' } = useParams();
  const controller = useDeliveryController(workspaceId, projectId);
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
  } = controller;
  const downloadPath = (format: 'json' | 'markdown') =>
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/release-candidates/${selectedCandidateId}/manifest/download?format=${format}`;
  const selectedCandidate = candidates.find((item) => item.id === selectedCandidateId);

  return (
    <div className={styles.stack}>
      <SectionHeader title="Delivery overview" eyebrow="FORGE / Truth states" />
      <p>
        Evidence provenance and gates are explicit. A blocked gate is not a publication or
        deployment claim.
      </p>
      {error && <p role="alert">{error}</p>}
      <DeliverySummary
        evidenceCount={evidence.length}
        candidateCount={candidates.length}
        ruleCount={rules.length}
      />
      <Card>
        <h2>Delivery verification</h2>
        <p>Candidate checks are deterministic and retained with their input fingerprint.</p>
        <StatusChip tone="warning">NOT_PUBLISHED</StatusChip>
        <p>Manifests are planning artifacts only, not a deployment or publication.</p>
      </Card>
      <div className={styles.forms}>
        <Card>
          <form onSubmit={addEvidence}>
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
          <form onSubmit={addCandidate}>
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
      <Card>
        <h3>Evidence</h3>
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
      <Card>
        <h3>Release candidates</h3>
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
        <Card>
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
      {selectedCandidate && (
        <Card>
          <h3>Verification rules</h3>
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
              <StatusChip tone={verification.outcome === 'PASS' ? 'success' : 'warning'}>
                {verification.outcome}
              </StatusChip>
              <p>Input fingerprint: {verification.input_fingerprint}</p>
              {verification.stale && <p>STALE evaluation: referenced inputs changed.</p>}
              {verification.blockers.map((blocker) => (
                <p key={blocker}>{blocker}</p>
              ))}
            </div>
          )}
          {verifications.map((item) => (
            <p key={item.id ?? item.rule_id}>
              {item.rule_id}: {item.outcome}
              {item.stale ? ' / STALE' : ''}
            </p>
          ))}
        </Card>
      )}
      {selectedCandidate && (
        <Card>
          <h3>Gate evaluation</h3>
          {gate ? (
            <>
              <StatusChip tone={gate.outcome === 'PASS' ? 'success' : 'warning'}>
                {gate.outcome}
              </StatusChip>
              <p>Input fingerprint: {gate.input_fingerprint}</p>
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
        </Card>
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
            <a href={downloadPath('json')}>JSON</a>
            <a href={downloadPath('markdown')}>Markdown</a>
          </div>
        </Card>
      )}
    </div>
  );
}
