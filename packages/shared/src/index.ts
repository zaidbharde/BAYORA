export type TestStatus = "draft" | "queued" | "running" | "passed" | "failed" | "cancelled";

export type Severity = "info" | "low" | "medium" | "high" | "critical";

export type TeamRole = "red-team" | "blue-team" | "client" | "system";

export type EventType =
  | "test.created"
  | "test.started"
  | "test.completed"
  | "security.event.detected"
  | "audit.entry.recorded";

export interface HealthResponse {
  status: "ok";
  service: "bayora-api";
}

