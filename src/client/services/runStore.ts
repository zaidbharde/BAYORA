import type { HarnessFinding, SyntheticRun, SyntheticStep } from "../../shared/types.js";

const STORAGE_KEY = "bayora.synthetic-runs.v1";
const MAX_STORED_RUNS = 5000;
const MAX_STEPS_PER_RUN = 100;
const MAX_FINDINGS_PER_RUN = 100;
const MAX_EVIDENCE_REFERENCES = 100;
const SCENARIO_IDS = new Set([
  "prompt-injection-fixture",
  "tool-allowlist-fixture",
  "output-canary-fixture",
]);

export interface RunStoreSnapshot {
  runs: SyntheticRun[];
  notice: string | null;
  writable: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isText(value: unknown, maxLength = 2048): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

function isTimestamp(value: unknown): value is string {
  return isText(value, 40) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}

function isSyntheticStep(value: unknown): value is SyntheticStep {
  if (!isRecord(value)) return false;
  return (
    isText(value.id, 160) &&
    isText(value.title, 256) &&
    isText(value.expected, 512) &&
    isText(value.observed, 512) &&
    typeof value.passed === "boolean"
  );
}

function isHarnessFinding(value: unknown): value is HarnessFinding {
  if (!isRecord(value)) return false;
  return (
    isText(value.id, 160) &&
    value.severity === "info" &&
    isText(value.title, 256) &&
    value.scope === "synthetic-harness" &&
    isText(value.detail, 1024)
  );
}

export function isSyntheticRunRecord(value: unknown): value is SyntheticRun {
  if (!isRecord(value)) return false;
  return (
    isText(value.id, 160) &&
    typeof value.scenarioId === "string" &&
    SCENARIO_IDS.has(value.scenarioId) &&
    isText(value.scenarioTitle, 256) &&
    isText(value.scenarioVersion, 128) &&
    isTimestamp(value.startedAt) &&
    isTimestamp(value.completedAt) &&
    (value.mode === "synthetic-local" || value.mode === "synthetic-server") &&
    (value.outcome === "PASS" || value.outcome === "FAIL") &&
    isText(value.summary, 2048) &&
    isText(value.inputReference, 512) &&
    isText(value.datasetReference, 512) &&
    isText(value.randomSeed, 160) &&
    value.modelConfiguration === "none — deterministic fixture engine" &&
    Array.isArray(value.steps) &&
    value.steps.length <= MAX_STEPS_PER_RUN &&
    value.steps.every(isSyntheticStep) &&
    Array.isArray(value.findings) &&
    value.findings.length <= MAX_FINDINGS_PER_RUN &&
    value.findings.every(isHarnessFinding) &&
    Array.isArray(value.evidenceReferences) &&
    value.evidenceReferences.length <= MAX_EVIDENCE_REFERENCES &&
    value.evidenceReferences.every((reference) => isText(reference, 512)) &&
    value.integrityStatus === "UNSIGNED_UNVERIFIED" &&
    value.humanReviewStatus === "NOT_REVIEWED" &&
    value.acceptanceStatus === "NOT_EVALUATED"
  );
}

export function loadRunStore(): RunStoreSnapshot {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { runs: [], notice: null, writable: true };
    const parsed: unknown = JSON.parse(raw);
    if (
      !Array.isArray(parsed) ||
      parsed.length > MAX_STORED_RUNS ||
      !parsed.every((run) => isSyntheticRunRecord(run) && run.mode === "synthetic-local")
    ) {
      return {
        runs: [],
        notice: "Saved browser data did not match the synthetic record format. It was left untouched; new runs stay in memory only for this tab.",
        writable: false,
      };
    }
    return { runs: parsed, notice: null, writable: true };
  } catch {
    return {
      runs: [],
      notice: "Browser-local storage is unavailable or unreadable. Existing saved data was not overwritten; new runs stay in memory only for this tab.",
      writable: false,
    };
  }
}

export function persistRunStore(runs: SyntheticRun[], writeAllowed: boolean): boolean {
  if (!writeAllowed || runs.length > MAX_STORED_RUNS || !runs.every((run) => isSyntheticRunRecord(run) && run.mode === "synthetic-local")) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
    return true;
  } catch {
    return false;
  }
}
