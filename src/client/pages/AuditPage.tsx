import { FileClock, Fingerprint, ShieldAlert } from "lucide-react";
import type { SyntheticRun } from "../../shared/types.js";
import { EmptyState, PageIntro, Panel, ScopeNotice, StatusBadge, formatDate } from "../components/UI.js";

type RunHistoryStatus = {
  loading: boolean;
  error: string | null;
  total: number;
  truncated: boolean;
};

interface AuditPageProps {
  runs: SyntheticRun[];
  storageNotice: string | null;
  history: RunHistoryStatus;
}

export function AuditPage({ runs, storageNotice, history }: AuditPageProps) {
  const totalLabel = history.error ? "UNAVAILABLE" : history.loading ? "LOADING" : history.total.toLocaleString("en-US");
  const emptyTitle = history.loading
    ? "Loading run history"
    : history.error
      ? "Run history unavailable"
      : history.truncated
        ? "History page incomplete"
        : "No records loaded";
  const emptyMessage = history.loading
    ? "Run records will appear when the BAYORA API responds."
    : history.error
      ? "The history request failed, so an empty history cannot be confirmed."
      : history.truncated
        ? "The API reports server records but returned an empty page. The history is incomplete; do not interpret this as an empty store."
        : "Start a synthetic fixture in the Security Lab. No protected Phoenix information is stored here.";

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="RECORDS / 06"
        title="Audit & evidence"
        description="Run history combines the server-reported synthetic-run total with known legacy browser-local records. This is not a cryptographically trusted or access-controlled audit system."
      />
      <ScopeNotice tone="warning">
        <strong>Unsigned and unverified.</strong> SQLite persistence survives a same-host restart but is not tamper-evident, shared, or backed up here. Legacy browser storage can be edited or cleared. No signature, trusted reviewer or final acceptance decision exists.
      </ScopeNotice>
      {storageNotice ? <div className="inline-warning" role="status">{storageNotice}</div> : null}
      {history.loading ? (
        <div className="inline-warning" role="status" aria-live="polite">Loading run history. Previously loaded records, if any, remain visible.</div>
      ) : null}
      {history.error ? (
        <div className="inline-warning" role="alert"><strong>Run history unavailable.</strong> {history.error} Previously loaded records, if shown, may be stale.</div>
      ) : null}
      {history.truncated ? (
        <div className="inline-warning" role="status">
          Only the latest server-history page is loaded; older server records are omitted from this list and Findings. The total metric is the server-reported total plus known legacy browser records.
        </div>
      ) : null}
      <div className="audit-metrics">
        <div><FileClock size={17} /><span>TOTAL RUN RECORDS</span><strong>{totalLabel}</strong></div>
        <div><Fingerprint size={17} /><span>INTEGRITY</span><strong>UNVERIFIED</strong></div>
        <div><ShieldAlert size={17} /><span>ACCEPTANCE</span><strong>NOT EVALUATED</strong></div>
      </div>
      <Panel title="Run records" kicker="SERVER SQLITE + LEGACY LOCAL">
        {runs.length === 0 ? (
          <EmptyState title={emptyTitle}>{emptyMessage}</EmptyState>
        ) : (
          <div className="audit-list">
            {runs.map((run) => (
              <article className="audit-record" key={run.id}>
                <div className="audit-record-main">
                  <div className="audit-record-title">
                    <div className="audit-record-symbol"><FileClock size={16} /></div>
                    <div><strong>{run.scenarioTitle}</strong><span className="mono">{run.id}</span></div>
                    <StatusBadge label={run.outcome === "PASS" ? "FIXTURE PASS" : "HARNESS MISMATCH"} tone={run.outcome === "PASS" ? "good" : "warn"} />
                  </div>
                  <p>{run.summary}</p>
                  <div className="audit-field-grid">
                    <div><span>DEFINITION</span><code>{run.scenarioId}@{run.scenarioVersion}</code></div>
                    <div><span>STARTED</span><code>{formatDate(run.startedAt)}</code></div>
                    <div><span>DATASET REFERENCE</span><code>{run.datasetReference}</code></div>
                    <div><span>MODEL / CONFIG</span><code>{run.modelConfiguration}</code></div>
                    <div><span>SEED</span><code>{run.randomSeed}</code></div>
                    <div><span>EVIDENCE REFERENCE</span><code>{run.evidenceReferences[0]}</code></div>
                  </div>
                  <div className="audit-state-row">
                    <StatusBadge label="UNSIGNED" tone="warn" />
                    <StatusBadge label="NOT REVIEWED" tone="muted" />
                    <StatusBadge label="NOT EVALUATED" tone="muted" />
                    <span className="audit-local-label">{run.mode === "synthetic-server" ? "SQLITE · SYNTHETIC ONLY" : "LEGACY BROWSER RECORD"}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
