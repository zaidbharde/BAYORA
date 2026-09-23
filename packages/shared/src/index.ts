export type TestScenarioId =
  | "prompt-injection"
  | "instruction-override"
  | "context-manipulation"
  | "data-exposure";

export interface TestScenario {
  id: TestScenarioId;
  name: string;
  description: string;
}

export const TEST_SCENARIOS: TestScenario[] = [
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
];

export type TestStatus = "pending" | "running" | "completed" | "blocked" | "failed";

export type TestResult = "allow" | "monitor" | "block" | "failed" | "not-run";

export type Severity = "low" | "medium" | "high" | "critical";

export type ResponseAction = "allow" | "monitor" | "block";

export type ConnectionStatus = "local" | "connected" | "degraded" | "offline";

export type EvaluationStatus = "idle" | "ready" | "evaluating" | "complete";

export type EventType =
  | "test.created"
  | "test.started"
  | "policy.evaluated"
  | "threat.detected"
  | "test.completed"
  | "audit.recorded";

export interface HealthResponse {
  status: "ok";
  service: "bayora-api";
}

export interface TestRunSummary {
  id: string;
  name: string;
  scenarioId: TestScenarioId;
  scenarioName: string;
  status: TestStatus;
  severity: Severity;
  result: TestResult;
  createdAt: string;
  completedAt: string | null;
}

export interface TestRun extends TestRunSummary {
  input: string;
  executionEvents: ActivityItem[];
}

export interface CreateTestRequest {
  name: string;
  scenarioId: TestScenarioId;
  input: string;
}

export interface ActivityItem {
  id: string;
  timestamp: string;
  type: EventType;
  title: string;
  detail: string;
  severity: Severity;
  testId: string | null;
  actor: string;
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  ruleId: string;
  ruleName: string;
  scenarioId: TestScenarioId;
  testId: string;
  title: string;
  detail: string;
  severity: Severity;
  action: ResponseAction;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  resource: string;
  action: string;
  result: string;
  testId: string | null;
  notes: string;
}

export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  scenarioIds: TestScenarioId[];
  patterns: string[];
  severity: Severity;
  action: ResponseAction;
}

export interface OverviewResponse {
  systemStatus: string;
  apiStatus: "online" | "offline";
  activeTests: number;
  securityEvents: number;
  threatsDetected: number;
  completedTests: number;
  recentActivity: ActivityItem[];
}

export interface SecurityEventsResponse {
  events: SecurityEvent[];
  rules: DetectionRule[];
}

export interface AuditLogsResponse {
  logs: AuditLogEntry[];
}

export interface TestsResponse {
  tests: TestRunSummary[];
}

export interface TestDetailResponse {
  test: TestRun;
}

export interface LlmStatusResponse {
  modelStatus: string;
  connectionStatus: ConnectionStatus;
  evaluationStatus: EvaluationStatus;
  provider: string;
  recentTests: TestRunSummary[];
}

export interface LlmAnalysisRequest {
  testName: string;
  scenarioName: string;
  input: string;
}

export interface LlmAnalysisResponse {
  summary: string;
  confidence: number;
  notes: string[];
}

export interface CreateTestResponse {
  test: TestRun;
}

export interface RunTestResponse {
  test: TestRun;
  securityEvents: SecurityEvent[];
  auditEntries: AuditLogEntry[];
}

