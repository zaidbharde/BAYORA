import type { SyntheticRun, SyntheticRunListResponse } from "../../shared/types.js";
import { isSyntheticRunRecord } from "./runStore.js";

const SOURCE = "bayora-sqlite-synthetic" as const;

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json() as unknown;
  } catch {
    throw new Error("BAYORA returned an unreadable API response.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isServerRun(value: unknown): value is SyntheticRun {
  return isSyntheticRunRecord(value) && value.mode === "synthetic-server";
}

async function assertSuccessful(response: Response): Promise<unknown> {
  const body = await readJson(response);
  if (!response.ok) {
    const message = isRecord(body) && typeof body.message === "string" && body.message.length <= 300
      ? body.message
      : "The BAYORA backend request failed.";
    throw new Error(message);
  }
  return body;
}

export async function loadServerRuns(): Promise<SyntheticRunListResponse> {
  const response = await fetch("/api/runs?limit=500", { cache: "no-store", headers: { Accept: "application/json" } });
  const body = await assertSuccessful(response);
  if (
    !isRecord(body) ||
    body.source !== SOURCE ||
    !Array.isArray(body.runs) ||
    body.runs.length > 500 ||
    !body.runs.every(isServerRun) ||
    !Number.isInteger(body.total) ||
    (body.total as number) < body.runs.length ||
    typeof body.truncated !== "boolean"
  ) {
    throw new Error("BAYORA returned a run list that did not match the API contract.");
  }
  return body as unknown as SyntheticRunListResponse;
}

export async function executeServerScenario(scenarioId: string): Promise<SyntheticRun> {
  const response = await fetch("/api/runs", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ scenarioId }),
  });
  const body = await assertSuccessful(response);
  if (!isRecord(body) || body.source !== SOURCE || !isServerRun(body.run)) {
    throw new Error("BAYORA returned a run that did not match the API contract.");
  }
  return body.run;
}

export async function executeServerSuite(): Promise<SyntheticRun[]> {
  const response = await fetch("/api/runs/suite", {
    method: "POST",
    headers: { Accept: "application/json" },
  });
  const body = await assertSuccessful(response);
  if (!isRecord(body) || body.source !== SOURCE || !Array.isArray(body.runs) || body.runs.length !== 3 || !body.runs.every(isServerRun)) {
    throw new Error("BAYORA returned a suite that did not match the API contract.");
  }
  return body.runs;
}
