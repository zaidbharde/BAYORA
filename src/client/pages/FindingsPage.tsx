import { AlertTriangle, CircleCheck } from "lucide-react";
import type { SyntheticRun } from "../../shared/types.js";
import { EmptyState, PageIntro, Panel, ScopeNotice, StatusBadge } from "../components/UI.js";

export function FindingsPage({ runs }: { runs: SyntheticRun[] }) {
  const findings = runs.flatMap((run) => run.findings.map((finding) => ({ finding, run })));
  return (
    <div className="page-stack">
      <PageIntro eyebrow="CLASSIFICATION / 04" title="Findings" description="This view contains harness regressions only. It does not scan a model, target application or real execution trace." />
      <ScopeNotice tone="warning"><strong>No model safety claim.</strong> A clean set of fixtures must not be interpreted as proof that an AI application is secure. Any item here is scoped to the synthetic harness.</ScopeNotice>
      <Panel title="Harness regressions" kicker="LOCAL FIXTURE SIGNALS" action={<StatusBadge label={`${findings.length} RECORDED`} tone={findings.length ? "warn" : "good"} />}>
        {findings.length === 0 ? <EmptyState title="No harness regressions recorded"><span>There are no fixture mismatches in the browser-local run history. This is not a model or deployment assessment.</span></EmptyState> : <div className="finding-list">{findings.map(({ finding, run }) => <article className="finding-row" key={finding.id}><span className="finding-icon"><AlertTriangle size={16} /></span><div className="finding-copy"><div><strong>{finding.title}</strong><StatusBadge label="INFO" tone="muted" /></div><p>{finding.detail}</p><span className="mono">{run.scenarioTitle} · {run.id}</span></div><span className="finding-scope">SYNTHETIC ONLY</span></article>)}</div>}
      </Panel>
      <div className="notice-card"><CircleCheck size={16} /><span>Severity, if present, refers to a fixture mismatch, not a real vulnerability rating.</span></div>
    </div>
  );
}
