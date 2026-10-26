import { BookOpenCheck, Database, LockKeyhole } from "lucide-react";
import { PageIntro, Panel, ScopeNotice, StatusBadge } from "../components/UI.js";

export function EvaluationsPage() {
  return (
    <div className="page-stack">
      <PageIntro eyebrow="DATA & EVALUATION / 05" title="Datasets & evaluations" description="The verified upstream source supports dataset and evaluation APIs. BAYORA is not connected to those protected data workflows in this checkpoint." />
      <ScopeNotice>There are no dataset records or evaluation metrics loaded here. The page does not use mock results to fill the gap.</ScopeNotice>
      <Panel title="Evaluation access is blocked" kicker="UPSTREAM CAPABILITY / BAYORA AUTHORIZATION">
        <div className="evaluation-block"><div className="evaluation-emblem"><BookOpenCheck size={22} /></div><div><h3>Connect only after access control is in place</h3><p>Protected dataset and experiment data will stay unavailable until BAYORA has an authorized identity, server-side checks on each request, and a verified integration against the exact upstream API contract.</p><div className="evaluation-gates"><div><Database size={15} /><span>Dataset listing / examples</span><StatusBadge label="BLOCKED" tone="warn" /></div><div><BookOpenCheck size={15} /><span>Experiment history / results</span><StatusBadge label="BLOCKED" tone="warn" /></div><div><LockKeyhole size={15} /><span>Human review / acceptance</span><StatusBadge label="NOT IMPLEMENTED" tone="muted" /></div></div></div></div>
      </Panel>
    </div>
  );
}
