import { ArrowDownRight, ArrowRight, Play, Shield, Sparkles } from "lucide-react";
import { useState } from "react";
import { scenarios } from "../../shared/scenarios.js";
import type { SyntheticRun } from "../../shared/types.js";
import { PageIntro, Panel, PrimaryButton, ScopeNotice, StatusBadge } from "../components/UI.js";

export function SecurityPage({
  runs,
  runOne,
  runSuite,
  runsLoading,
  runsError,
  runActionError,
  runHistoryTruncated,
}: {
  runs: SyntheticRun[];
  runOne: (scenarioId: string) => Promise<SyntheticRun>;
  runSuite: () => Promise<SyntheticRun[]>;
  runsLoading: boolean;
  runsError: string | null;
  runActionError: string | null;
  runHistoryTruncated: boolean;
}) {
  const [latest, setLatest] = useState<SyntheticRun | null>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const executeOne = async (scenarioId: string) => {
    setBusy(true);
    setLocalError(null);
    try {
      setLatest(await runOne(scenarioId));
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "The server-side fixture run failed.");
    } finally {
      setBusy(false);
    }
  };

  const executeSuite = async () => {
    setBusy(true);
    setLocalError(null);
    try {
      setLatest((await runSuite())[0] ?? null);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "The server-side synthetic suite failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="TEST DESIGN / 02"
        title="Security Lab"
        description="The BAYORA server executes only these versioned deterministic rules against built-in fixtures and persists the generated results in its SQLite file. No model, arbitrary target, external tool or caller-supplied fixture is involved."
        action={<PrimaryButton icon={<Play size={16} />} disabled={busy || runsLoading} onClick={() => void executeSuite()}>{busy ? "Running…" : "Run all fixtures"}</PrimaryButton>}
      />
      <ScopeNotice tone="warning"><strong>Simulation only.</strong> These server-backed records demonstrate bounded scenario plumbing, not adversarial model testing, authorization, isolation or a deployed security control. Records remain unsigned, unverified, unreviewed and not accepted.</ScopeNotice>

      {runsLoading ? <p className="inline-warning" role="status">Loading the latest server run history…</p> : null}
      {runsError ? <p className="inline-error" role="alert">Server history unavailable: {runsError}</p> : null}
      {localError || runActionError ? <p className="inline-error" role="alert">{localError ?? runActionError}</p> : null}
      {runHistoryTruncated ? <p className="inline-warning" role="status">Showing the most recent 500 server records plus any legacy browser-local records; scenario counts below cover this loaded history window.</p> : null}

      {latest ? <div className="result-banner" role="status"><span className="result-mark"><Sparkles size={17} /></span><div><strong>{latest.outcome === "PASS" ? "Fixture completed as expected" : "Harness mismatch recorded"}</strong><span>{latest.scenarioTitle} · {latest.id} · server SQLite record · unsigned, not independently verified</span></div><StatusBadge label={latest.outcome === "PASS" ? "SYNTHETIC PASS" : "SYNTHETIC FAIL"} tone={latest.outcome === "PASS" ? "good" : "warn"} /></div> : null}

      <div className="scenario-list">
        {scenarios.map((scenario, index) => {
          const count = runs.filter((run) => run.scenarioId === scenario.id).length;
          return (
            <Panel key={scenario.id} title={scenario.title} kicker={`SCENARIO 0${index + 1} / ${scenario.category.toUpperCase()}`} className="scenario-panel">
              <div className="scenario-layout">
                <div className="scenario-summary"><p>{scenario.description}</p><div className="scenario-meta"><span className="mono">VERSION {scenario.version}</span><span className="scenario-divider" /><span className="mono">{count} LOADED RUN{count === 1 ? "" : "S"}</span></div></div>
                <div className="scenario-details">
                  <div><span>THREAT MODEL</span><p>{scenario.threatModel}</p></div>
                  <div><span>PROCEDURE</span><p>{scenario.procedure}</p></div>
                  <div><span>EXPECTED BEHAVIOR</span><p>{scenario.expectedBehavior}</p></div>
                </div>
              </div>
              <div className="scenario-footer"><div className="scenario-scope"><Shield size={15} /><span>Fixed fixture · server execution · no external target</span></div><button className="button button-secondary" type="button" disabled={busy || runsLoading} onClick={() => void executeOne(scenario.id)}><Play size={14} />{busy ? "Running…" : "Run fixture"}<ArrowDownRight size={14} /></button></div>
            </Panel>
          );
        })}
      </div>
      <div className="subtle-note"><ArrowRight size={14} /><span>SQLite persists the synthetic record; the record is not a cryptographic audit proof or human acceptance.</span></div>
    </div>
  );
}
