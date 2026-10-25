import { useEffect, useState } from "react";
import { Activity, Check, CircleHelp, Database, LockKeyhole, RefreshCcw, Server, Shield } from "lucide-react";
import type { PhoenixHealthStatus } from "../../shared/types.js";
import { PageIntro, Panel, SecondaryButton, StatusBadge } from "../components/UI.js";

interface AppHealth {
  status: string;
  service: string;
  mode: string;
}

export function EnvironmentPage({ phoenix, loading, error, refresh }: { phoenix: PhoenixHealthStatus | null; loading: boolean; error: string | null; refresh: () => void }) {
  const [appHealth, setAppHealth] = useState<AppHealth | null>(null);
  const [appHealthError, setAppHealthError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/health", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("health response not successful");
        return (await response.json()) as AppHealth;
      })
      .then((health) => { if (active) setAppHealth(health); })
      .catch(() => { if (active) setAppHealthError("BAYORA API health is unavailable."); });
    return () => { active = false; };
  }, []);

  const phoenixTone = phoenix?.state === "healthy" ? "good" : phoenix?.state === "blocked" ? "warn" : phoenix?.state === "error" || phoenix?.state === "unavailable" ? "bad" : "muted";
  return (
    <div className="page-stack">
      <PageIntro eyebrow="DIAGNOSTICS / 07" title="Environment" description="Only live health responses are shown as service state. Other prerequisites are labeled from this prototype's actual configuration." action={<SecondaryButton icon={<RefreshCcw size={15} />} onClick={refresh} disabled={loading}>{loading ? "Checking…" : "Recheck Phoenix"}</SecondaryButton>} />
      <div className="two-column-grid">
        <Panel title="Service health" kicker="LIVE CHECKS">
          <div className="service-row"><span className="service-row-icon"><Server size={17} /></span><div><strong>BAYORA API</strong><span>{appHealth?.status === "ok" ? "Response received from /api/health" : appHealthError ?? "Waiting for health response…"}</span></div><StatusBadge label={appHealth?.status === "ok" ? "HEALTHY" : appHealthError ? "UNAVAILABLE" : "CHECKING"} tone={appHealth?.status === "ok" ? "good" : appHealthError ? "bad" : "muted"} /></div>
          <div className="service-row"><span className="service-row-icon"><Activity size={17} /></span><div><strong>Phoenix</strong><span>{phoenix?.message ?? "Waiting for /healthz probe…"}</span></div><StatusBadge label={phoenix?.state?.replaceAll("_", " ").toUpperCase() ?? "CHECKING"} tone={phoenixTone} /></div>
          {error ? <p className="inline-error" role="alert">{error}</p> : null}
        </Panel>
        <Panel title="Access & storage" kicker="CURRENT PROTOTYPE BOUNDARIES">
          <div className="prereq-list"><div><LockKeyhole size={16} /><div><strong>User identity</strong><span>No BAYORA login / identity provider is configured.</span></div><StatusBadge label="BLOCKED" tone="warn" /></div><div><Shield size={16} /><div><strong>Protected Phoenix data</strong><span>Data routes remain disabled until server-side authorization is verified.</span></div><StatusBadge label="BLOCKED" tone="warn" /></div><div><Database size={16} /><div><strong>Database</strong><span>No managed BAYORA database enabled; synthetic runs stay in this browser.</span></div><StatusBadge label="LOCAL ONLY" tone="signal" /></div></div>
        </Panel>
      </div>
      <Panel title="Prerequisite ledger" kicker="KNOWN LIMITATIONS">
        <div className="prereq-cards"><div><div className="prereq-card-title"><Check size={15} /><strong>Upstream baseline verified</strong></div><p>Official Phoenix `main` at commit <code>f74341ff</code>; supplied archive matches every tracked file.</p><StatusBadge label="SOURCE CHECKED" tone="good" /></div><div><div className="prereq-card-title"><CircleHelp size={15} /><strong>Phoenix runtime</strong></div><p>No authorized Phoenix service URL or identity is configured in this environment. Real traces/evaluations are not loaded.</p><StatusBadge label="NOT CONFIGURED" tone="muted" /></div><div><div className="prereq-card-title"><Database size={15} /><strong>Persistence / evidence</strong></div><p>Browser-local records are editable, unsigned and unverified; there is no database, signing key or review workflow.</p><StatusBadge label="NOT VERIFIED" tone="warn" /></div></div>
      </Panel>
    </div>
  );
}
