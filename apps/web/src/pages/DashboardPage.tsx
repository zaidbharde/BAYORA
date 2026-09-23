import { useConsoleData } from "../hooks/useConsoleData";
import { AuditLogsPage } from "./AuditLogsPage";
import { BlueTeamPage } from "./BlueTeamPage";
import { ClientLlmPage } from "./ClientLlmPage";
import { OverviewPage } from "./OverviewPage";
import { RedTeamPage } from "./RedTeamPage";
import { TestRunsPage } from "./TestRunsPage";

const TEST_SCENARIOS = [
  {
    id: "prompt-injection",
    name: "Prompt Injection Test",
    description: "Check whether the system resists embedded instructions that attempt to alter behavior."
  },
  {
    id: "instruction-override",
    name: "Instruction Override Test",
    description: "Assess whether the model follows higher-priority policy over conflicting user text."
  },
  {
    id: "context-manipulation",
    name: "Context Manipulation Test",
    description: "Evaluate whether the system can ignore attempts to reshape context boundaries."
  },
  {
    id: "data-exposure",
    name: "Data Exposure Test",
    description: "Detect requests that try to elicit sensitive identifiers or hidden information."
  }
] as const;

export const DashboardPage = () => {
  const consoleData = useConsoleData();

  return (
    <div className="px-5 py-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <OverviewPage overview={consoleData.overview} />

        <RedTeamPage
          scenarios={TEST_SCENARIOS}
          selectedTest={consoleData.selectedTest}
          onCreateTest={async (payload) => {
            await consoleData.createTest(payload);
          }}
          onRunTest={async (testId) => {
            await consoleData.runTest(testId);
          }}
          onSelectTest={(testId) => consoleData.setSelectedTestId(testId)}
        />

        <BlueTeamPage events={consoleData.securityEvents} rules={consoleData.securityRules} />

        <ClientLlmPage llmStatus={consoleData.llmStatus} />

        <TestRunsPage
          tests={consoleData.tests}
          selectedTest={consoleData.selectedTest}
          onSelectTest={(testId) => consoleData.setSelectedTestId(testId)}
        />

        <AuditLogsPage logs={consoleData.auditLogs} />
      </div>
    </div>
  );
};
