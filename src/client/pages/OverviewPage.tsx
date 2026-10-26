import { ArrowRight, CircleCheck, Clock3, Play, Radio, RefreshCcw, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { scenarios } from "../../shared/scenarios.js";
import type { PhoenixHealthStatus, SyntheticRun } from "../../shared/types.js";
import { Panel, PageIntro, PrimaryButton, ScopeNotice, SecondaryButton, StatusBadge } from "../components/UI.js";
import { RunTable } from "../components/RunTable.js";

export function OverviewPage({
  runs,
  passCount,
  runCount,
  runSuite,
  storageNotice,
  runsLoading,
  runsError,
  runActionError,
  runHistoryTruncated,
  refreshRuns,
  phoenix,
  refreshPhoenix,
  phoenixLoading,
  phoenixError,
}: {
  runs: SyntheticRun[];
  passCount: number;
  runCount: number;
  runSuite: () => Promise<SyntheticRun[]>;
  storageNotice: string | null;
  runsLoading: boolean;
  runsError: string | null;
  runActionError: string | null;
  runHistoryTruncated: boolean;
  refreshRuns: () => Promise<void>;
  phoenix: PhoenixHealthStatus | null;
  refreshPhoenix: () => void;
  phoenixLoading: boolean;
  phoenixError: string | null;
}) {
  const regressions = runs.filter((run) => run.outcome === "FAIL").length;
  const lastRun = runs[0];
  const connected = phoenix?.state === "healthy";

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="CONTROL ROOM / 01"
        title="Test the boundary. Keep the evidence."
        description="A bounded workbench for server-executed deterministic security fixtures. The run records below come from BAYORA's local SQLite store; legacy browser records are labeled separately."
        action={<PrimaryButton icon={<Play size={16} />} disabled={runsLoading} onClick={() => { void runSuite().catch(() => undefined); }}>{runsLoading ? "Loading history…" : "Run synthetic suite"}</PrimaryButton>}
      />

      <ScopeNotice>
        <strong>Simulation only.</strong> This backend uses fixed synthetic fixtures. It does not call a model, execute tools, connect to a live target, load upstream traces or verify a deployed security control.
      </ScopeNotice>
      {runsError ? <p className="inline-error" role="alert">Server run history is unavailable: {runsError}</p> : null}
      {runActionError ? <p className="inline-error" role="alert">{runActionError}</p> : null}
      {runHistoryTruncated ? <p className="inline-warning" role="status">Showing the latest 500 server records. Overall stored count is shown; pass and mismatch counts below are calculated from the loaded window.</p> : null}

      <div className="metric-row">
        <article className="metric-card metric-card-emphasis"><div className="metric-top"><span>STORED SYNTHETIC RUNS</span><Clock3 size={16} /></div><strong>{runsLoading ? "—" : runCount}</strong><p>Server SQLite + legacy browser records</p><div className="metric-track"><span style={{ width: `${runCount ? Math.min(100, 20 + runCount * 8) : 0}%` }} /></div></article>
        <article className="metric-card"><div className="metric-top"><span>LOADED FIXTURE PASSES</span><CircleCheck size={16} /></div><strong>{runsLoading ? "—" : passCount}</strong><p>Expected local-rule outcomes in loaded history</p><div className="metric-foot mono">{runs.length ? `${Math.round((passCount / runs.length) * 100)}% OF LOADED` : "NO DATA YET"}</div></article>
        <article className="metric-card"><div className="metric-top"><span>LOADED HARNESS MISMATCHES</span><ShieldAlert size={16} /></div><strong>{runsLoading ? "—" : regressions}</strong><p>Not production security findings</p><div className="metric-foot mono">{regressions ? "REVIEW THE FIXTURE" : "NO LOADED MISMATCHES"}</div></article>
        <article className="metric-card"><div className="metric-top"><span>AVAILABLE FIXTURES</span><Radio size={16} /></div><strong>{scenarios.length.toString().padStart(2, "0")}</strong><p>Deterministic · versioned inputs</p><div className="metric-foot mono">SYNTHETIC V1</div></article>
      </div>

      <div className="overview-grid">
        <Panel title="Recent synthetic runs" kicker="SERVER SQLITE + LEGACY LOCAL" action={<Link className="text-link" to="/audit">Review records <ArrowRight size={14} /></Link>} className="runs-panel">
          <RunTable runs={runs} compact />
          <div className="panel-actions"><SecondaryButton icon={<RefreshCcw size={15} />} onClick={() => { void refreshRuns(); }} disabled={runsLoading}>{runsLoading ? "Loading…" : "Refresh run history"}</SecondaryButton><span className="caption">Stored total: {runCount}{runHistoryTruncated ? " · latest 500 loaded" : ""}</span></div>
        </Panel>
        <Panel title="Observability service" kicker="UPSTREAM SERVICE" action={<Link className="icon-link" to="/observability" aria-label="Open AI Observability"><ArrowRight size={16} /></Link>} className="phoenix-panel">
          <div className="phoenix-status-card">
            <span className={`phoenix-orb ${connected ? "orb-live" : ""}`}><Radio size={19} /></span>
            <div className="phoenix-status-copy"><strong>{phoenix?.state === "healthy" ? "Health endpoint responding" : phoenix?.state === "not_configured" ? "Not configured" : phoenix?.state === "blocked" ? "Health probe denied" : phoenix?.state === "error" ? "Configuration error" : phoenix?.state === "unavailable" ? "Upstream unavailable" : "Awaiting health result"}</strong><span>{phoenix?.message ?? "Checking the server-side health route…"}</span></div>
          </div>
          <div className="phoenix-meta"><span>PROBE PATH</span><code>/healthz</code><span className="phoenix-meta-separator" /><span>DATA ACCESS</span><StatusBadge label="BLOCKED" tone="warn" /></div>
          {phoenixError ? <p className="inline-error" role="alert">{phoenixError}</p> : null}
          <div className="panel-actions"><SecondaryButton icon={<RefreshCcw size={15} />} onClick={refreshPhoenix} disabled={phoenixLoading}>{phoenixLoading ? "Probing…" : "Refresh health"}</SecondaryButton><span className="caption">Health only · no trace data requested</span></div>
        </Panel>
      </div>

      <Panel title="Fixture coverage" kicker="BUILT-IN / V1" action={<Link className="text-link" to="/security">Open Security Lab <ArrowRight size={14} /></Link>}>
        <div className="fixture-strip">
          {scenarios.map((scenario, index) => {
            const count = runs.filter((run) => run.scenarioId === scenario.id).length;
            return <div className="fixture-tile" key={scenario.id}><span className="fixture-index mono">0{index + 1}</span><div><strong>{scenario.title}</strong><span>{scenario.category}</span></div><div className="fixture-count"><strong>{count}</strong><span>loaded runs</span></div></div>;
          })}
        </div>
      </Panel>

      {lastRun ? <p className="last-run-note mono">LATEST RECORD / {lastRun.id} / {lastRun.integrityStatus}</p> : null}
      {storageNotice ? <p className="inline-warning">Legacy browser history: {storageNotice}</p> : null}
    </div>
  );
}
