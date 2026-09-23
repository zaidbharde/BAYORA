import { randomUUID } from "node:crypto";
import type {
  ActivityItem,
  AuditLogEntry,
  CreateTestRequest,
  CreateTestResponse,
  RunTestResponse,
  TestDetailResponse,
  TestResult,
  TestRun,
  TestRunSummary,
  TestScenario,
  TestScenarioId
} from "@bayora/shared";
import { getScenarioById } from "../red-team/index.js";
import type { AuditService } from "../audit/index.js";
import type { DetectionResult, DetectionService } from "../blue-team/index.js";
import type { SecurityEventRepository } from "../security/index.js";
import type { LLMService } from "../llm/index.js";
import { MemoryCollection } from "../storage.js";

export interface TestRepository {
  list(): TestRun[];
  listSummaries(): TestRunSummary[];
  getById(testId: string): TestRun | null;
  save(testRun: TestRun): TestRun;
}

export class InMemoryTestRepository implements TestRepository {
  private readonly tests = new MemoryCollection<TestRun>();

  list(): TestRun[] {
    return this.tests.list();
  }

  listSummaries(): TestRunSummary[] {
    return this.list()
      .slice()
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map(({ executionEvents: _executionEvents, input: _input, ...summary }) => summary);
  }

  getById(testId: string): TestRun | null {
    return this.tests.getById(testId);
  }

  save(testRun: TestRun): TestRun {
    return this.tests.upsert(testRun);
  }
}

const createActivityItem = (
  type: ActivityItem["type"],
  title: string,
  detail: string,
  severity: ActivityItem["severity"],
  testId: string | null,
  actor: string
): ActivityItem => ({
  id: randomUUID(),
  timestamp: new Date().toISOString(),
  type,
  title,
  detail,
  severity,
  testId,
  actor
});

const deriveResult = (decision: DetectionResult["decision"]): TestResult => {
  if (decision === "block") {
    return "block";
  }

  if (decision === "monitor") {
    return "monitor";
  }

  return "allow";
};

export class TestService {
  constructor(
    private readonly repository: TestRepository,
    private readonly detectionService: DetectionService,
    private readonly auditService: AuditService,
    private readonly securityEvents: SecurityEventRepository,
    private readonly llmService: LLMService
  ) {}

  listTests(): TestRunSummary[] {
    return this.repository.listSummaries();
  }

  getTest(testId: string): TestRun | null {
    return this.repository.getById(testId);
  }

  createTest(request: CreateTestRequest): CreateTestResponse {
    const scenario: TestScenario = getScenarioById(request.scenarioId as TestScenarioId);
    const now = new Date().toISOString();
    const test: TestRun = {
      id: randomUUID(),
      name: request.name,
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      input: request.input,
      status: "pending",
      severity: "medium",
      result: "not-run",
      createdAt: now,
      completedAt: null,
      executionEvents: [
        {
          id: randomUUID(),
          timestamp: now,
          type: "test.created",
          title: "Test created",
          detail: `${scenario.name} queued for review.`,
          severity: "low",
          testId: null,
          actor: "red-team"
        }
      ]
    };

    this.repository.save(test);
    this.auditService.record({
      actor: "Red Team",
      resource: `Test ${test.id}`,
      action: "Created Test",
      result: "Allowed",
      testId: test.id,
      notes: `${scenario.name} created for controlled evaluation.`
    });

    return { test };
  }

  runTest(test: TestRun): RunTestResponse {
    const runningTest: TestRun = {
      ...test,
      status: "running",
      executionEvents: [
        ...test.executionEvents,
        createActivityItem(
          "test.started",
          "Test started",
          `${test.scenarioName} is now under evaluation.`,
          "medium",
          test.id,
          "red-team"
        )
      ]
    };

    this.repository.save(runningTest);

    const analysis = this.llmService.analyze({
      testName: test.name,
      scenarioName: test.scenarioName,
      input: test.input
    });

    const detection = this.detectionService.evaluate(runningTest);
    const securityEvents = detection.events.map((event) => this.securityEvents.add(event));

    const policyActivity = createActivityItem(
      "policy.evaluated",
      "Policy evaluated",
      analysis.summary,
      detection.severity,
      test.id,
      "blue-team"
    );

    const latestActivity: ActivityItem[] = [policyActivity];

    if (securityEvents.length > 0) {
      const firstEvent = securityEvents[0]!;
      latestActivity.unshift(
        createActivityItem(
          "threat.detected",
          "Threat detected",
          `${firstEvent.ruleName} matched the current input.`,
          firstEvent.severity,
          test.id,
          "blue-team"
        )
      );
    }

    const completedAt = new Date().toISOString();
    const finalStatus = detection.decision === "block" ? "blocked" : "completed";
    const finalResult = deriveResult(detection.decision);

    const completedTest: TestRun = {
      ...runningTest,
      status: finalStatus,
      severity: detection.severity,
      result: finalResult,
      completedAt,
      executionEvents: [
        ...runningTest.executionEvents,
        ...latestActivity,
        createActivityItem(
          "test.completed",
          finalStatus === "blocked" ? "Test blocked" : "Test completed",
          finalStatus === "blocked" ? "The control set blocked the test input." : "The test completed within policy.",
          detection.severity,
          test.id,
          "system"
        )
      ]
    };

    this.repository.save(completedTest);

    const auditEntries: AuditLogEntry[] = [
      this.auditService.record({
        actor: "Red Team",
        resource: `Test ${test.id}`,
        action: "Started Test",
        result: "Running",
        testId: test.id,
        notes: `${test.scenarioName} execution started.`
      }),
      this.auditService.record({
        actor: "Blue Team",
        resource: `Test ${test.id}`,
        action: "Policy Evaluation",
        result: securityEvents.length > 0 ? "Blocked" : "Allowed",
        testId: test.id,
        notes: detection.summary
      }),
      this.auditService.record({
        actor: "System",
        resource: `Test ${test.id}`,
        action: finalStatus === "blocked" ? "Blocked Test" : "Completed Test",
        result: finalStatus === "blocked" ? "Blocked" : "Allowed",
        testId: test.id,
        notes: finalStatus === "blocked" ? "Test blocked by detection controls." : "Test completed successfully."
      })
    ];

    return {
      test: completedTest,
      securityEvents,
      auditEntries
    };
  }
}

export const toTestDetailResponse = (test: TestRun): TestDetailResponse => ({
  test
});

