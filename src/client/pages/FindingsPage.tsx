import { AlertTriangle, CircleCheck } from "lucide-react";
import type { SyntheticRun } from "../../shared/types.js";
import { EmptyState, PageIntro, Panel, ScopeNotice, StatusBadge } from "../components/UI.js";

type RunHistoryStatus = {
  loading: boolean;
  error: string | null;
  total: number;
  truncated: boolean;
};

interface FindingsPageProps {
  runs: SyntheticRun[];
  history: RunHistoryStatus;
}

export function FindingsPage({ runs, history }: FindingsPageProps) {
  const findings = runs.flatMap((run) => run.findings.map((finding) => ({ finding, run })));
  const emptyTitle = history.loading
    ? "Loading run history"
    : history.error
      ? "Findings unavailable"
      : history.truncated
        ? runs.length === 0 ? "History page incomplete" : "No findings in the loaded records"
        : "No harness regressions recorded";
  const emptyMessage = history.loading
    ? "Findings will appear after the BAYORA run-history request completes."
    : history.error
      ? "The history request failed, so a complete empty finding set cannot be confirmed."
      : history.truncated
        ? runs.length === 0
          ? "The API reports server records but no run records are loaded, so findings cannot be determined. Do not treat this state as a no-findings result."
          : "No fixture mismatches are present in the loaded page. Older server runs were not loaded and may contain additional findings."
        : "There are no fixture mismatches in the available server SQLite history or legacy browser records. This is not a model or deployment assessment.";

  return (
    <div className="page-stack">
      <PageIntro eyebrow="CLASSIFICATION / 04" title="Findings" description="This view contains harness regressions only. It does not scan a model, target application or real execution trace." />
      <ScopeNotice tone="warning">
        <strong>No model safety claim.</strong> A clean set of fixtures must not be interpreted as proof that an AI application is secure. Any item here is scoped to the synthetic harness.
      </ScopeNotice>
      {history.loading ? (
        <div className="inline-warning" role="status" aria-live="polite">Loading run history. Findings shown during refresh are from the last successful load.</div>
      ) : null}
      {history.error ? (
        <div className="inline-warning" role="alert"><strong>Run history unavailable.</strong> {history.error} The displayed findings may be stale.</div>
      ) : null}
      {history.truncated ? (
        <div className="inline-warning" role="status">
          Finding counts cover only the loaded run page. The server reports {history.total.toLocaleString("en-US")} total run records; older records were not loaded.
        </div>
      ) : null}
      <Panel
        title="Harness regressions"
        kicker="SYNTHETIC FIXTURE MISMATCHES"
        action={<StatusBadge label={`${findings.length} IN LOADED RUNS`} tone={findings.length ? "warn" : "good"} />}
      >
        {findings.length === 0 ? (
          <EmptyState title={emptyTitle}><span>{emptyMessage}</span></EmptyState>
        ) : (
          <div className="finding-list">
            {findings.map(({ finding, run }) => (
              <article className="finding-row" key={finding.id}>
                <span className="finding-icon"><AlertTriangle size={16} /></span>
                <div className="finding-copy">
                  <div><strong>{finding.title}</strong><StatusBadge label="INFO" tone="muted" /></div>
                  <p>{finding.detail}</p>
                  <span className="mono">{run.scenarioTitle} · {run.id}</span>
                </div>
                <span className="finding-scope">SYNTHETIC ONLY</span>
              </article>
            ))}
          </div>
        )}
      </Panel>
      <div className="notice-card"><CircleCheck size={16} /><span>Severity, if present, refers to a fixture mismatch, not a real vulnerability rating.</span></div>
    </div>
  );
}
