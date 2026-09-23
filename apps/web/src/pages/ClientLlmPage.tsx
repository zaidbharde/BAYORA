import type { LlmStatusResponse } from "@bayora/shared";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { MetricCard } from "../components/MetricCard";
import { Panel } from "../components/Panel";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";

interface ClientLlmPageProps {
  llmStatus: LlmStatusResponse | null;
}

export const ClientLlmPage = ({ llmStatus }: ClientLlmPageProps) => (
  <section id="client-llm" className="space-y-6 scroll-mt-6">
    <PageHeader
      eyebrow="Client LLM"
      title="Local Adapter Boundary"
      description="Inspect the model adapter state, evaluation readiness, and the latest tests observed by the local provider interface."
      actions={<StatusBadge status={llmStatus?.connectionStatus ?? "idle"} />}
    />

    <div className="grid gap-4 md:grid-cols-3">
      <MetricCard label="Model Status" value={llmStatus?.modelStatus ?? "Unavailable"} detail="The current adapter reports its local model state." />
      <MetricCard label="Connection Status" value={llmStatus?.connectionStatus ?? "idle"} detail="Adapter connection state exposed by the service layer." />
      <MetricCard label="Evaluation Status" value={llmStatus?.evaluationStatus ?? "idle"} detail="Current evaluation readiness for the local provider." />
    </div>

    <Panel title="Recent Tests" subtitle="LLM Context">
      <DataTable
        rows={llmStatus?.recentTests ?? []}
        emptyState={<EmptyState title="No recent tests" description="Create and run a test to populate the model context feed." />}
        columns={[
          { key: "name", label: "Test", render: (test) => test.name },
          { key: "scenario", label: "Scenario", render: (test) => test.scenarioName },
          { key: "status", label: "Status", render: (test) => <StatusBadge status={test.status} /> },
          { key: "result", label: "Result", render: (test) => test.result }
        ]}
      />
    </Panel>
  </section>
);
