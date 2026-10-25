import { FileClock, Fingerprint, ShieldAlert } from "lucide-react";
import type { SyntheticRun } from "../../shared/types.js";
import { EmptyState, PageIntro, Panel, ScopeNotice, StatusBadge, formatDate } from "../components/UI.js";

export function AuditPage({ runs, storageNotice }: { runs: SyntheticRun[]; storageNotice: string | null }) {
  return (
    <div className="page-stack">
      <PageIntro eyebrow="RECORDS / 06" title="Audit & evidence" description="Browser-local metadata for repeatable synthetic fixtures. This ledger is not a cryptographically trusted or access-controlled audit system." />
      <ScopeNotice tone="warning"><strong>Unsigned and unverified.</strong> Browser storage can be edited or cleared by its user. No signature, trusted reviewer or final acceptance decision exists.</ScopeNotice>
      {storageNotice ? <div className="inline-warning" role="status">{storageNotice}</div> : null}
      <div className="audit-metrics"><div><FileClock size={17} /><span>LOCAL RECORDS</span><strong>{runs.length}</strong></div><div><Fingerprint size={17} /><span>INTEGRITY</span><strong>UNVERIFIED</strong></div><div><ShieldAlert size={17} /><span>ACCEPTANCE</span><strong>NOT EVALUATED</strong></div></div>
      <Panel title="Run ledger" kicker="UNSIGNED BROWSER RECORDS">
        {runs.length === 0 ? <EmptyState title="The ledger is empty">Start a synthetic fixture in the Security Lab. No protected Phoenix information is saved here.</EmptyState> : <div className="audit-list">{runs.map((run) => <article className="audit-record" key={run.id}><div className="audit-record-main"><div className="audit-record-title"><div className="audit-record-symbol"><FileClock size={16} /></div><div><strong>{run.scenarioTitle}</strong><span className="mono">{run.id}</span></div><StatusBadge label={run.outcome === "PASS" ? "FIXTURE PASS" : "HARNESS MISMATCH"} tone={run.outcome === "PASS" ? "good" : "warn"} /></div><p>{run.summary}</p><div className="audit-field-grid"><div><span>DEFINITION</span><code>{run.scenarioId}@{run.scenarioVersion}</code></div><div><span>STARTED</span><code>{formatDate(run.startedAt)}</code></div><div><span>DATASET REFERENCE</span><code>{run.datasetReference}</code></div><div><span>MODEL / CONFIG</span><code>{run.modelConfiguration}</code></div><div><span>SEED</span><code>{run.randomSeed}</code></div><div><span>EVIDENCE REFERENCE</span><code>{run.evidenceReferences[0]}</code></div></div><div className="audit-state-row"><StatusBadge label="UNSIGNED" tone="warn" /><StatusBadge label="NOT REVIEWED" tone="muted" /><StatusBadge label="NOT EVALUATED" tone="muted" /><span className="audit-local-label">SAVED IN THIS BROWSER</span></div></div></article>)}</div>}
      </Panel>
    </div>
  );
}
