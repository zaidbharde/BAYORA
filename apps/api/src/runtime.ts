import type { ActivityItem, OverviewResponse } from "@bayora/shared";
import { AuditService, InMemoryAuditRepository } from "./modules/audit/index.js";
import { DetectionService } from "./modules/blue-team/index.js";
import { LLMService, MockLLMProvider } from "./modules/llm/index.js";
import { InMemorySecurityEventRepository } from "./modules/security/index.js";
import { InMemoryTestRepository, TestService } from "./modules/tests/index.js";

const testRepository = new InMemoryTestRepository();
const securityEventRepository = new InMemorySecurityEventRepository();
const auditRepository = new InMemoryAuditRepository();
const auditService = new AuditService(auditRepository);
const detectionService = new DetectionService();
const llmService = new LLMService(new MockLLMProvider());
const testService = new TestService(
  testRepository,
  detectionService,
  auditService,
  securityEventRepository,
  llmService
);

const buildRecentActivity = (): ActivityItem[] => {
  const testActivity = testRepository
    .list()
    .flatMap((test) => test.executionEvents.map((event) => ({ ...event, testId: test.id })));
  const auditActivity: ActivityItem[] = auditRepository.list().map((entry) => ({
    id: entry.id,
    timestamp: entry.timestamp,
    type: "audit.recorded",
    title: entry.action,
    detail: `${entry.actor} recorded ${entry.result} for ${entry.resource}.`,
    severity: entry.result === "Blocked" ? "high" : "low",
    testId: entry.testId,
    actor: entry.actor
  }));

  return [...testActivity, ...auditActivity].sort((left, right) => right.timestamp.localeCompare(left.timestamp)).slice(0, 12);
};

export const bayoraRuntime = {
  auditRepository,
  auditService,
  detectionService,
  llmService,
  securityEventRepository,
  testRepository,
  testService,
  buildOverview(): OverviewResponse {
    const tests = testRepository.list();
    const securityEvents = securityEventRepository.list();

    return {
      systemStatus: "Operational",
      apiStatus: "online",
      activeTests: tests.filter((test) => test.status === "pending" || test.status === "running").length,
      securityEvents: securityEvents.length,
      threatsDetected: securityEvents.filter((event) => event.action === "block").length,
      completedTests: tests.filter((test) => test.status === "completed").length,
      recentActivity: buildRecentActivity()
    };
  }
};
