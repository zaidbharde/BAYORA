import { useEffect, useState } from "react";
import { Activity, Check, CircleHelp, Database, LockKeyhole, RefreshCcw, Server, Shield } from "lucide-react";
import type { PhoenixHealthStatus } from "../../shared/types.js";
import { PageIntro, Panel, SecondaryButton, StatusBadge } from "../components/UI.js";

interface AppHealth {
  status: "ok" | "degraded";
  service: string;
  mode: string;
  persistence: { state: string; count?: number; maxRecords?: number; schemaVersion?: number };
  protectedPhoenixData: "blocked";
}

export function EnvironmentPage({ phoenix, loading, error, refresh }: { phoenix: PhoenixHealthStatus | null; loading: boolean; error: string | null; refresh: () => void }) {
  const [appHealth, setAppHealth] = useState<AppHealth | null>(null);
  const [appHealthError, setAppHealthError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/health", { cache: "no-store" })
      .then(async (response) => {
        const health = await response.json() as AppHealth;
        if (active) setAppHealth(health);
        if (!response.ok || health.status !== "ok" || health.persistence?.state !== "ready") throw new Error("Health response indicates a degraded service.");
      })
      .catch(() => { if (active) setAppHealthError("BAYORA API or its persistence layer is degraded."); });
    return () => { active = false; };
  }, []);

  const phoenixTone = phoenix?.state === "healthy" ? "good" : phoenix?.state === "blocked" ? "warn" : phoenix?.state === "error" || phoenix?.state === "unavailable" ? "bad" : "muted";
  const apiHealthy = appHealth?.status === "ok" && appHealth.persistence.state === "ready";
  return (
    <div className="page-stack">
      <PageIntro eyebrow="DIAGNOSTICS / 07" title="Environment" description="Live diagnostics report BAYORA's API and SQLite state. Phoenix remains a separate health-only probe; its data APIs are blocked." action={<SecondaryButton icon={<RefreshCcw size={15} />} onClick={refresh} disabled={loading}>{loading ? "Checking…" : "Recheck Phoenix"}</SecondaryButton>} />
      <div className="two-column-grid">
        <Panel title="Service health" kicker="LIVE CHECKS">
          <div className="service-row"><span className="service-row-icon"><Server size={17} /></span><div><strong>BAYORA API</strong><span>{apiHealthy ? "API responding; SQLite schema and query are ready." : appHealthError ?? "Waiting for the server health response…"}</span></div><StatusBadge label={apiHealthy ? "HEALTHY" : appHealthError ? "DEGRADED" : "CHECKING"} tone={apiHealthy ? "good" : appHealthError ? "bad" : "muted"} /></div>
          <div className="service-row"><span className="service-row-icon"><Database size={17} /></span><div><strong>SQLite persistence</strong><span>{appHealth?.persistence.state === "ready" ? `${appHealth.persistence.count ?? 0} synthetic records · schema v${appHealth.persistence.schemaVersion ?? "?"} · maximum ${appHealth.persistence.maxRecords ?? "?"}` : "Database readiness not verified."}</span></div><StatusBadge label={appHealth?.persistence.state === "ready" ? "READY" : appHealthError ? "UNAVAILABLE" : "CHECKING"} tone={appHealth?.persistence.state === "ready" ? "good" : appHealthError ? "bad" : "muted"} /></div>
          <div className="service-row"><span className="service-row-icon"><Activity size={17} /></span><div><strong>Phoenix</strong><span>{phoenix?.message ?? "Waiting for /healthz probe…"}</span></div><StatusBadge label={phoenix?.state?.replaceAll("_", " ").toUpperCase() ?? "CHECKING"} tone={phoenixTone} /></div>
          {error ? <p className="inline-error" role="alert">{error}</p> : null}
        </Panel>
        <Panel title="Access & storage" kicker="CURRENT SERVER BOUNDARIES">
          <div className="prereq-list"><div><LockKeyhole size={16} /><div><strong>User identity</strong><span>No BAYORA user identity or owner allowlist is configured. Only fixed synthetic fixture endpoints are exposed.</span></div><StatusBadge label="LIMITED" tone="warn" /></div><div><Shield size={16} /><div><strong>Protected Phoenix data</strong><span>Trace, dataset, experiment and evaluation operations fail closed pending server-validated identity and authorization.</span></div><StatusBadge label="BLOCKED" tone="warn" /></div><div><Database size={16} /><div><strong>Database</strong><span>Single-process SQLite file for non-confidential synthetic fixtures. Not shared across container instances or durable on ephemeral hosting.</span></div><StatusBadge label="SINGLE NODE" tone="signal" /></div></div>
        </Panel>
      </div>
      <Panel title="Prerequisite ledger" kicker="KNOWN LIMITATIONS">
        <div className="prereq-cards"><div><div className="prereq-card-title"><Check size={15} /><strong>Upstream baseline verified</strong></div><p>Official Phoenix `main` at commit <code>f74341ff</code>; supplied archive matches every tracked file.</p><StatusBadge label="SOURCE CHECKED" tone="good" /></div><div><div className="prereq-card-title"><CircleHelp size={15} /><strong>Phoenix runtime / data</strong></div><p>No authorized Phoenix service URL or identity is configured in this environment. Real traces/evaluations are not loaded.</p><StatusBadge label="DATA BLOCKED" tone="warn" /></div><div><div className="prereq-card-title"><Database size={15} /><strong>Persistence / evidence</strong></div><p>SQLite preserves only fixed synthetic records on one persistent host. It is not a backup, tamper-evident ledger, signature, or review workflow.</p><StatusBadge label="SYNTHETIC ONLY" tone="warn" /></div></div>
      </Panel>
    </div>
  );
}
