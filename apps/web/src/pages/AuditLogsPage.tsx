import type { AuditLogEntry } from "@bayora/shared";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { Panel } from "../components/Panel";
import { PageHeader } from "../components/PageHeader";

interface AuditLogsPageProps {
  logs: AuditLogEntry[];
}

export const AuditLogsPage = ({ logs }: AuditLogsPageProps) => (
  <section id="audit-logs" className="space-y-6 scroll-mt-6">
    <PageHeader
      eyebrow="Audit Logs"
      title="Immutable Activity Trail"
      description="Review security actions separately from application logging to preserve the operational audit record."
    />

    <Panel title="Audit Entries" subtitle="Compliance Record">
      <DataTable
        rows={logs}
        emptyState={<EmptyState title="No audit entries" description="Create and run a test to generate audit activity." />}
        columns={[
          { key: "timestamp", label: "Timestamp", render: (entry) => new Date(entry.timestamp).toLocaleString() },
          { key: "event", label: "Event", render: (entry) => entry.action },
          { key: "actor", label: "Actor", render: (entry) => entry.actor },
          { key: "resource", label: "Resource", render: (entry) => entry.resource },
          { key: "result", label: "Result", render: (entry) => entry.result }
        ]}
      />
    </Panel>
  </section>
);
