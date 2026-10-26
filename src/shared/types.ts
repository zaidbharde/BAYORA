export type HarnessOutcome = "PASS" | "FAIL";
export type SyntheticScenarioId =
  | "prompt-injection-fixture"
  | "tool-allowlist-fixture"
  | "output-canary-fixture";

export interface SyntheticStep {
  id: string;
  title: string;
  expected: string;
  observed: string;
  passed: boolean;
}

export interface HarnessFinding {
  id: string;
  severity: "info";
  title: string;
  scope: "synthetic-harness";
  detail: string;
}

export interface SyntheticRun {
  id: string;
  scenarioId: SyntheticScenarioId;
  scenarioTitle: string;
  scenarioVersion: string;
  startedAt: string;
  completedAt: string;
  mode: "synthetic-local" | "synthetic-server";
  outcome: HarnessOutcome;
  summary: string;
  inputReference: string;
  datasetReference: string;
  randomSeed: string;
  modelConfiguration: "none — deterministic fixture engine";
  steps: SyntheticStep[];
  findings: HarnessFinding[];
  evidenceReferences: string[];
  integrityStatus: "UNSIGNED_UNVERIFIED";
  humanReviewStatus: "NOT_REVIEWED";
  acceptanceStatus: "NOT_EVALUATED";
}

export interface PhoenixHealthStatus {
  state: "not_configured" | "healthy" | "blocked" | "unavailable" | "error";
  checkedAt: string | null;
  httpStatus: number | null;
  message: string;
  scope: "health-only";
}

export interface SyntheticRunListResponse {
  runs: SyntheticRun[];
  total: number;
  truncated: boolean;
  source: "bayora-sqlite-synthetic";
}

export interface SyntheticRunResponse {
  run: SyntheticRun;
  source: "bayora-sqlite-synthetic";
}

export interface ScenarioDefinition {
  id: SyntheticScenarioId;
  title: string;
  category: string;
  description: string;
  threatModel: string;
  procedure: string;
  expectedBehavior: string;
  version: string;
}
