import { Activity, ArrowUpRight, Database, LockKeyhole, RefreshCcw } from "lucide-react";
import type { PhoenixHealthStatus } from "../../shared/types.js";
import { PageIntro, Panel, ScopeNotice, SecondaryButton, StatusBadge } from "../components/UI.js";

export function ObservabilityPage({
  phoenix,
  loading,
  error,
  refresh,
}: {
  phoenix: PhoenixHealthStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}) {
  const tone = phoenix?.state === "healthy" ? "good" : phoenix?.state === "blocked" ? "warn" : phoenix?.state === "error" || phoenix?.state === "unavailable" ? "bad" : "muted";
  return (
    <div className="page-stack">
      <PageIntro eyebrow="UPSTREAM / 03" title="AI Observability" description="Phoenix is the intended observability backend. This checkpoint probes service health only; trace content is deliberately unavailable." action={<SecondaryButton icon={<RefreshCcw size={15} />} onClick={refresh} disabled={loading}>{loading ? "Checking…" : "Refresh health"}</SecondaryButton>} />
      <ScopeNotice><strong>Protected data remains blocked.</strong> A healthy `/healthz` response says nothing about authentication, trace visibility, execution outcomes or evidence integrity. No traces, spans, projects or tool calls are requested by BAYORA.</ScopeNotice>
      <div className="two-column-grid">
        <Panel title="Phoenix health probe" kicker="LIVE RESPONSE · WHEN CONFIGURED">
          <div className="health-readout"><div className={`health-icon health-${tone}`}><Activity size={21} /></div><div><div className="health-title">{phoenix?.state === "healthy" ? "Service responds" : phoenix?.state === "blocked" ? "Probe denied" : phoenix?.state === "not_configured" ? "Connection not configured" : phoenix?.state === "unavailable" ? "Service unavailable" : phoenix?.state === "error" ? "Configuration error" : "Waiting for server response"}</div><p>{phoenix?.message ?? "BAYORA is checking the configured upstream health endpoint."}</p></div></div>
          <div className="detail-list"><div><span>Endpoint</span><code>/healthz</code></div><div><span>HTTP status</span><code>{phoenix?.httpStatus ?? "—"}</code></div><div><span>Checked</span><code>{phoenix?.checkedAt ? new Date(phoenix.checkedAt).toLocaleString() : "Not checked"}</code></div><div><span>Probe scope</span><StatusBadge label="HEALTH ONLY" tone="signal" /></div></div>
          {error ? <p className="inline-error" role="alert">{error}</p> : null}
        </Panel>
        <Panel title="Trace access" kicker="AUTHORIZATION GATE">
          <div className="blocked-feature"><div className="blocked-icon"><LockKeyhole size={19} /></div><div><h3>Not enabled in this prototype</h3><p>Trace retrieval requires a verified, server-enforced identity and access policy. No identity provider or authorized Phoenix account is configured here.</p></div></div>
          <div className="feature-checks"><div><Database size={14} /><span>Trace retrieval</span><StatusBadge label="BLOCKED" tone="warn" /></div><div><ArrowUpRight size={14} /><span>Trace ingestion / OTLP forwarding</span><StatusBadge label="BLOCKED" tone="warn" /></div><div><LockKeyhole size={14} /><span>Model/tool execution details</span><StatusBadge label="BLOCKED" tone="warn" /></div></div>
        </Panel>
      </div>
      <Panel title="Supported upstream surfaces" kicker="SOURCE-VERIFIED · NOT CONNECTED">
        <div className="surface-grid"><div><strong>Trace ingestion</strong><code>OTLP HTTP /v1/traces</code><span>Verified in the fetched Phoenix source; BAYORA does not forward runs yet.</span></div><div><strong>REST API</strong><code>/v1</code><span>Source includes project, trace, dataset and evaluation routes; protected requests are not made here.</span></div><div><strong>GraphQL</strong><code>/graphql</code><span>Mounted by the upstream FastAPI application; unavailable until authorization is designed.</span></div></div>
      </Panel>
    </div>
  );
}
