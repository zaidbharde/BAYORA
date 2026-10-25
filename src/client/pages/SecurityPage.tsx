import { ArrowDownRight, ArrowRight, Play, Shield, Sparkles } from "lucide-react";
import { useState } from "react";
import { scenarios } from "../../shared/scenarios.js";
import type { SyntheticRun } from "../../shared/types.js";
import { PageIntro, Panel, PrimaryButton, ScopeNotice, StatusBadge } from "../components/UI.js";

export function SecurityPage({
  runs,
  runOne,
  runSuite,
}: {
  runs: SyntheticRun[];
  runOne: (scenarioId: string) => SyntheticRun;
  runSuite: () => SyntheticRun[];
}) {
  const [latest, setLatest] = useState<SyntheticRun | null>(null);

  return (
    <div className="page-stack">
      <PageIntro
        eyebrow="TEST DESIGN / 02"
        title="Security Lab"
        description="Each scenario executes a deterministic local rule against a fixed synthetic fixture. No model, network target or real tool is involved."
        action={<PrimaryButton icon={<Play size={16} />} onClick={() => setLatest(runSuite()[0] ?? null)}>Run all fixtures</PrimaryButton>}
      />
      <ScopeNotice tone="warning"><strong>Not a red-team environment.</strong> These checks demonstrate scenario/result plumbing only. They do not measure the behavior of an AI model or prove isolation, authorization or safety in a deployed system.</ScopeNotice>

      {latest ? <div className="result-banner" role="status"><span className="result-mark"><Sparkles size={17} /></span><div><strong>{latest.outcome === "PASS" ? "Fixture completed as expected" : "Harness mismatch recorded"}</strong><span>{latest.scenarioTitle} · {latest.id} · unsigned, not independently verified</span></div><StatusBadge label={latest.outcome === "PASS" ? "SYNTHETIC PASS" : "SYNTHETIC FAIL"} tone={latest.outcome === "PASS" ? "good" : "warn"} /></div> : null}

      <div className="scenario-list">
        {scenarios.map((scenario, index) => {
          const count = runs.filter((run) => run.scenarioId === scenario.id).length;
          return (
            <Panel key={scenario.id} title={scenario.title} kicker={`SCENARIO 0${index + 1} / ${scenario.category.toUpperCase()}`} className="scenario-panel">
              <div className="scenario-layout">
                <div className="scenario-summary"><p>{scenario.description}</p><div className="scenario-meta"><span className="mono">VERSION {scenario.version}</span><span className="scenario-divider" /><span className="mono">{count} LOCAL RUN{count === 1 ? "" : "S"}</span></div></div>
                <div className="scenario-details">
                  <div><span>THREAT MODEL</span><p>{scenario.threatModel}</p></div>
                  <div><span>PROCEDURE</span><p>{scenario.procedure}</p></div>
                  <div><span>EXPECTED BEHAVIOR</span><p>{scenario.expectedBehavior}</p></div>
                </div>
              </div>
              <div className="scenario-footer"><div className="scenario-scope"><Shield size={15} /><span>Local fixture · no external execution</span></div><button className="button button-secondary" type="button" onClick={() => setLatest(runOne(scenario.id))}><Play size={14} />Run fixture<ArrowDownRight size={14} /></button></div>
            </Panel>
          );
        })}
      </div>
      <div className="subtle-note"><ArrowRight size={14} /><span>Records appear in Audit with local-only, unsigned and unverified status.</span></div>
    </div>
  );
}
