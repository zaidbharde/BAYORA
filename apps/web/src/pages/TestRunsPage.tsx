import type { TestRun, TestRunSummary } from "@bayora/shared";
import { DataTable } from "../components/DataTable";
import { EmptyState } from "../components/EmptyState";
import { Panel } from "../components/Panel";
import { PageHeader } from "../components/PageHeader";
import { SeverityBadge } from "../components/SeverityBadge";
import { StatusBadge } from "../components/StatusBadge";

interface TestRunsPageProps {
  tests: TestRunSummary[];
  selectedTest: TestRun | null;
  onSelectTest: (testId: string) => void;
}

export const TestRunsPage = ({ tests, selectedTest, onSelectTest }: TestRunsPageProps) => (
  <section id="test-runs" className="space-y-6 scroll-mt-6">
    <PageHeader
      eyebrow="Test Runs"
      title="Execution History"
      description="Open any test run to review its lifecycle, policy decision, and execution result."
    />

    <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
      <Panel title="All Test Runs" subtitle="History">
        <DataTable
          rows={tests}
          onRowClick={(test) => onSelectTest(test.id)}
          emptyState={<EmptyState title="No test runs" description="Create a test in the Red Team workspace to start building history." />}
          columns={[
            { key: "id", label: "Test ID", render: (test) => test.id.slice(0, 8) },
            { key: "scenario", label: "Scenario", render: (test) => test.scenarioName },
            { key: "status", label: "Status", render: (test) => <StatusBadge status={test.status} /> },
            { key: "severity", label: "Severity", render: (test) => <SeverityBadge severity={test.severity} /> },
            { key: "created", label: "Created", render: (test) => new Date(test.createdAt).toLocaleString() },
            { key: "completed", label: "Completed", render: (test) => (test.completedAt ? new Date(test.completedAt).toLocaleString() : "—") },
            { key: "result", label: "Result", render: (test) => test.result }
          ]}
        />
      </Panel>

      <Panel title="Run Details" subtitle="Selected Test">
        {selectedTest ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={selectedTest.status} />
              <SeverityBadge severity={selectedTest.severity} />
              <span className="rounded border border-bayora-border bg-black/15 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                {selectedTest.result}
              </span>
            </div>
            <div className="rounded border border-bayora-border bg-black/15 p-4 text-sm text-slate-300">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Input</p>
              <p className="mt-2 leading-6">{selectedTest.input}</p>
            </div>
            <div className="rounded border border-bayora-border bg-black/15 p-4 text-sm text-slate-300">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Execution events</p>
              <ul className="mt-3 space-y-2">
                {selectedTest.executionEvents.map((event) => (
                  <li key={event.id} className="rounded border border-bayora-border bg-[#0D1420] px-3 py-2">
                    <span className="text-white">{event.title}</span>
                    <span className="ml-2 text-xs uppercase tracking-[0.2em] text-slate-500">{event.type.replaceAll(".", " ")}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <EmptyState title="Select a test run" description="Choose a run from the table to inspect its full lifecycle." />
        )}
      </Panel>
    </div>
  </section>
);
