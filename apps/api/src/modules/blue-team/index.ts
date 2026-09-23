import { randomUUID } from "node:crypto";
import type { DetectionRule, ResponseAction, SecurityEvent, Severity, TestRun } from "@bayora/shared";
import { createSecurityEvent } from "../security/index.js";

const severityRank: Record<Severity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

const actionRank: Record<ResponseAction, number> = {
  allow: 1,
  monitor: 2,
  block: 3
};

export const detectionRules: DetectionRule[] = [
  {
    id: "rule-prompt-injection",
    name: "Prompt Injection Guard",
    description: "Detects attempts to override model instructions or reveal hidden prompts.",
    scenarioIds: ["prompt-injection", "instruction-override"],
    patterns: ["ignore previous", "reveal system prompt", "developer message", "override instructions"],
    severity: "high",
    action: "block"
  },
  {
    id: "rule-context-manipulation",
    name: "Context Boundary Guard",
    description: "Detects attempts to reshape context handling or leak session memory.",
    scenarioIds: ["context-manipulation"],
    patterns: ["context window", "memory", "conversation history", "forget policy"],
    severity: "medium",
    action: "monitor"
  },
  {
    id: "rule-data-exposure",
    name: "Sensitive Data Guard",
    description: "Detects prompts that request secrets, credentials, or hidden values.",
    scenarioIds: ["data-exposure"],
    patterns: ["api key", "secret", "password", "token", "credential", "ssh key"],
    severity: "critical",
    action: "block"
  }
];

export interface DetectionResult {
  decision: ResponseAction;
  severity: Severity;
  matchedRules: DetectionRule[];
  events: SecurityEvent[];
  summary: string;
}

export class DetectionService {
  constructor(private readonly rules: DetectionRule[] = detectionRules) {}

  listRules(): DetectionRule[] {
    return this.rules;
  }

  evaluate(test: TestRun): DetectionResult {
    const input = `${test.name} ${test.scenarioName} ${test.input}`.toLowerCase();
    const matchedRules = this.rules.filter((rule) =>
      rule.scenarioIds.includes(test.scenarioId) &&
      rule.patterns.some((pattern) => input.includes(pattern.toLowerCase()))
    );

    if (!matchedRules.length) {
      return {
        decision: "allow",
        severity: "low",
        matchedRules: [],
        events: [],
        summary: "No policy breach detected."
      };
    }

    const strongestRule = matchedRules.reduce((strongest, rule) => {
      const actionDiff = actionRank[rule.action] - actionRank[strongest.action];
      if (actionDiff > 0) {
        return rule;
      }

      if (actionDiff < 0) {
        return strongest;
      }

      return severityRank[rule.severity] > severityRank[strongest.severity] ? rule : strongest;
    }, matchedRules[0]!);

    return {
      decision: strongestRule.action,
      severity: strongestRule.severity,
      matchedRules,
      events: matchedRules.map((rule) =>
        createSecurityEvent({
          ruleId: rule.id,
          ruleName: rule.name,
          scenarioId: test.scenarioId,
          testId: test.id,
          title: rule.name,
          detail: rule.description,
          severity: rule.severity,
          action: rule.action
        })
      ),
      summary: `${matchedRules.length} control(s) matched the active policy set.`
    };
  }
}
export interface BlueTeamModule {
  readonly name: "blue-team";
}

export const blueTeamModule: BlueTeamModule = {
  name: "blue-team"
};

