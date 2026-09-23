import type { SecurityEvent, DetectionRule } from "@bayora/shared";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { MetricCard } from "../components/MetricCard";
import { Panel } from "../components/Panel";
import { PageHeader } from "../components/PageHeader";
import { SeverityBadge } from "../components/SeverityBadge";
import { StatusBadge } from "../components/StatusBadge";

interface BlueTeamPageProps {
  events: SecurityEvent[];
  rules: DetectionRule[];
}

export const BlueTeamPage = ({ events, rules }: BlueTeamPageProps) => {
  const threatCount = events.filter((event) => event.action === "block").length;
  const severityOrder = ["low", "medium", "high", "critical"] as const;
  const highestSeverity =
    events.reduce<(typeof severityOrder)[number]>((current, event) => {
      const currentRank = severityOrder.indexOf(current);
      const eventRank = severityOrder.indexOf(event.severity);
      return eventRank > currentRank ? event.severity : current;
    }, "low") ?? "low";

  return (
    <section id="blue-team" className="space-y-6 scroll-mt-6">
      <PageHeader
        eyebrow="Blue Team"
        title="Monitoring Workspace"
        description="Review rule matches, response actions, and the current monitoring posture for controlled security tests."
        actions={<StatusBadge status={events.length ? "monitoring" : "ready"} />}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Detection Rules" value={String(rules.length)} detail="Rule-based control set loaded by the detection engine." />
        <MetricCard label="Security Events" value={String(events.length)} detail="Events recorded by the policy evaluation flow." />
        <MetricCard label="Threat Severity" value={highestSeverity} detail={`${threatCount} blocked event(s) detected by the current controls.`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel title="Detection Rules" subtitle="Policy Set">
          {rules.length ? (
            <div className="space-y-3">
              {rules.map((rule) => (
                <article key={rule.id} className="rounded border border-bayora-border bg-[#0D1420] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{rule.name}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-400">{rule.description}</p>
                    </div>
                    <SeverityBadge severity={rule.severity} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                    {rule.patterns.map((pattern) => (
                      <span key={pattern} className="rounded border border-bayora-border bg-black/20 px-2 py-1">
                        {pattern}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No detection rules" description="The rule engine has not been initialised." />
          )}
        </Panel>

        <Panel title="Security Events" subtitle="Recent Detections">
          <DataTable
            rows={events}
            emptyState={<EmptyState title="No security events" description="Run a test to populate the security event stream." />}
            columns={[
              {
                key: "timestamp",
                label: "Timestamp",
                render: (event) => new Date(event.timestamp).toLocaleString()
              },
              {
                key: "rule",
                label: "Rule",
                render: (event) => event.ruleName
              },
              {
                key: "action",
                label: "Response Action",
                render: (event) => <StatusBadge status={event.action} />
              },
              {
                key: "severity",
                label: "Severity",
                render: (event) => <SeverityBadge severity={event.severity} />
              }
            ]}
          />
        </Panel>
      </div>
    </section>
  );
};
