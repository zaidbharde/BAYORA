import type { OverviewResponse } from "@bayora/shared";
import { EmptyState } from "../components/EmptyState";
import { EventTimeline } from "../components/EventTimeline";
import { MetricCard } from "../components/MetricCard";
import { Panel } from "../components/Panel";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { SystemStatus } from "../components/SystemStatus";

interface OverviewPageProps {
  overview: OverviewResponse | null;
}

export const OverviewPage = ({ overview }: OverviewPageProps) => (
  <section id="overview" className="space-y-6 scroll-mt-6">
    <PageHeader
      eyebrow="Overview"
      title="Security Operations Dashboard"
      description="Track platform health, test activity, policy decisions, and the latest security events in one operational view."
    />

    <SystemStatus />

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="System Status" value={overview?.systemStatus ?? "Unknown"} detail="Console health reported by the API." />
      <MetricCard label="API Status" value={overview?.apiStatus ? overview.apiStatus.toUpperCase() : "Unknown"} detail="Backend availability." />
      <MetricCard label="Active Tests" value={String(overview?.activeTests ?? 0)} detail="Tests currently pending or running." />
      <MetricCard label="Completed Tests" value={String(overview?.completedTests ?? 0)} detail="Tests that reached a terminal result." />
      <MetricCard label="Security Events" value={String(overview?.securityEvents ?? 0)} detail="Recorded detection events." />
      <MetricCard label="Threats Detected" value={String(overview?.threatsDetected ?? 0)} detail="Events that triggered a blocking response." />
      <div className="rounded border border-bayora-border bg-[#0D1420] p-4 md:col-span-2 xl:col-span-2">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Current Posture</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <StatusBadge status={overview?.apiStatus ?? "idle"} />
          <span className="rounded border border-bayora-border bg-black/20 px-3 py-2 text-sm text-slate-300">
            Test orchestration and policy evaluation are active.
          </span>
        </div>
      </div>
    </div>

    <Panel title="Recent Activity" subtitle="Timeline">
      {overview?.recentActivity.length ? (
        <EventTimeline items={overview.recentActivity} />
      ) : (
        <EmptyState
          title="No activity recorded"
          description="Create and run a test to populate the operational timeline with test, policy, and audit events."
        />
      )}
    </Panel>
  </section>
);
