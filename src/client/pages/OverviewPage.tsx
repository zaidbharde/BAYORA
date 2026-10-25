import { ArrowRight, CircleCheck, Clock3, Play, Radio, RefreshCcw, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { scenarios } from "../../shared/scenarios.js";
import type { PhoenixHealthStatus, SyntheticRun } from "../../shared/types.js";
import { Panel, PageIntro, PrimaryButton, ScopeNotice, SecondaryButton, StatusBadge } from "../components/UI.js";
import { RunTable } from "../components/RunTable.js";

export function OverviewPage({
  runs,
  passCount,
  runSuite,
  storageNotice,
  phoenix,
  refreshPhoenix,
  phoenixLoading,
  phoenixError,
}: {
  runs: SyntheticRun[];
  passCount: number;
  runSuite: () => SyntheticRun[];
  storageNotice: string | null;
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
        description="A bounded workbench for synthetic AI security checks. Every count below comes from this browser's recorded fixture runs."
        action={<PrimaryButton icon={<Play size={16} />} onClick={runSuite}>Run synthetic suite</PrimaryButton>}
      />

      <ScopeNotice>
        <strong>Simulation only.</strong> This harness uses fixed local fixtures; it does not call a model, execute tools, connect to a live target, or verify a deployed security control.
      </ScopeNotice>

      <div className="metric-row">
        <article className="metric-card metric-card-emphasis"><div className="metric-top"><span>LOCAL RUN RECORDS</span><Clock3 size={16} /></div><strong>{runs.length}</strong><p>Stored in this browser only</p><div className="metric-track"><span style={{ width: `${runs.length ? Math.min(100, 20 + runs.length * 8) : 0}%` }} /></div></article>
        <article className="metric-card"><div className="metric-top"><span>FIXTURE PASSES</span><CircleCheck size={16} /></div><strong>{passCount}</strong><p>Expected local rule outcomes</p><div className="metric-foot mono">{runs.length ? `${Math.round((passCount / runs.length) * 100)}% of local runs` : "NO DATA YET"}</div></article>
        <article className="metric-card"><div className="metric-top"><span>HARNESS MISMATCHES</span><ShieldAlert size={16} /></div><strong>{regressions}</strong><p>Not production security findings</p><div className="metric-foot mono">{regressions ? "REVIEW THE FIXTURE" : "NO LOCAL MISMATCHES"}</div></article>
        <article className="metric-card"><div className="metric-top"><span>AVAILABLE FIXTURES</span><Radio size={16} /></div><strong>{scenarios.length.toString().padStart(2, "0")}</strong><p>Deterministic · versioned inputs</p><div className="metric-foot mono">SYNTHETIC V1</div></article>
      </div>

      <div className="overview-grid">
        <Panel title="Recent synthetic runs" kicker="LOCAL EVIDENCE" action={<Link className="text-link" to="/audit">Review records <ArrowRight size={14} /></Link>} className="runs-panel">
          <RunTable runs={runs} compact />
        </Panel>
        <Panel title="Phoenix connection" kicker="UPSTREAM SERVICE" action={<Link className="icon-link" to="/observability" aria-label="Open AI Observability"><ArrowRight size={16} /></Link>} className="phoenix-panel">
          <div className="phoenix-status-card">
            <span className={`phoenix-orb ${connected ? "orb-live" : ""}`}><Radio size={19} /></span>
            <div className="phoenix-status-copy"><strong>{phoenix?.state === "healthy" ? "Health endpoint responding" : phoenix?.state === "not_configured" ? "Not configured" : phoenix?.state === "blocked" ? "Health probe denied" : phoenix?.state === "error" ? "Configuration error" : phoenix?.state === "unavailable" ? "Phoenix unavailable" : "Awaiting health result"}</strong><span>{phoenix?.message ?? "Checking the server-side health route…"}</span></div>
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
            return <div className="fixture-tile" key={scenario.id}><span className="fixture-index mono">0{index + 1}</span><div><strong>{scenario.title}</strong><span>{scenario.category}</span></div><div className="fixture-count"><strong>{count}</strong><span>runs</span></div></div>;
          })}
        </div>
      </Panel>

      {lastRun ? <p className="last-run-note mono">LATEST RECORD / {lastRun.id} / {lastRun.integrityStatus}</p> : null}
      {storageNotice ? <p className="inline-warning">{storageNotice}</p> : null}
    </div>
  );
}
