import { Router, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { runSyntheticScenario, runSyntheticSuite } from "../shared/scenarios.js";
import type { PhoenixHealthStatus } from "../shared/types.js";
import { SyntheticRunStoreFullError, type SyntheticRunRepository } from "./db.js";

interface ApiOptions {
  phoenixBaseUrl?: string;
  fetcher?: typeof fetch;
  probeTimeoutMs?: number;
  runStore?: SyntheticRunRepository;
  now?: () => Date;
  createRunId?: () => string;
  maxWritesPerMinute?: number;
}

const SCENARIO_IDS = new Set([
  "prompt-injection-fixture",
  "tool-allowlist-fixture",
  "output-canary-fixture",
]);
const MAX_LIST_LIMIT = 500;
const DEFAULT_LIST_LIMIT = 100;

export function normalizePhoenixHealthUrl(value: string): URL | null {
  try {
    const base = new URL(value.trim());
    if (
      !["http:", "https:"].includes(base.protocol) ||
      base.username ||
      base.password ||
      base.search ||
      base.hash
    ) {
      return null;
    }
    const prefix = base.pathname.replace(/\/+$/, "");
    base.pathname = `${prefix}/healthz`;
    return base;
  } catch {
    return null;
  }
}

function apiError(response: Response, status: number, error: string, message: string): void {
  response.setHeader("Cache-Control", "no-store");
  response.status(status).json({ error, message });
}

function readScenarioId(request: Request): string | null {
  const body: unknown = request.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  if (Object.keys(record).length !== 1 || typeof record.scenarioId !== "string" || !SCENARIO_IDS.has(record.scenarioId)) return null;
  return record.scenarioId;
}

function readListLimit(request: Request): number | null {
  const raw = request.query.limit;
  if (raw === undefined) return DEFAULT_LIST_LIMIT;
  if (typeof raw !== "string" || !/^\d{1,3}$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= MAX_LIST_LIMIT ? parsed : null;
}

function reportRunStorageError(error: unknown, response: Response): void {
  if (error instanceof SyntheticRunStoreFullError) {
    apiError(response, 409, "storage_full", "Synthetic run storage reached its configured record limit; no records were deleted.");
    return;
  }
  apiError(response, 500, "storage_error", "The synthetic run record could not be stored.");
}

function requestHasBody(request: Request): boolean {
  const rawLength = request.get("content-length");
  const hasContentLength = rawLength !== undefined && Number(rawLength) > 0;
  return request.body !== undefined || hasContentLength || request.get("transfer-encoding") !== undefined;
}

export function createApiRouter(options: ApiOptions = {}): Router {
  const router = Router();
  const phoenixBaseUrl = options.phoenixBaseUrl ?? process.env.PHOENIX_BASE_URL ?? "";
  const fetcher = options.fetcher ?? fetch;
  const probeTimeoutMs = options.probeTimeoutMs ?? 3500;
  const now = options.now ?? (() => new Date());
  const createRunId = options.createRunId ?? randomUUID;
  const runStore = options.runStore;
  const maxWritesPerMinute = options.maxWritesPerMinute ?? 60;
  if (!Number.isInteger(maxWritesPerMinute) || maxWritesPerMinute < 1 || maxWritesPerMinute > 1000) {
    throw new RangeError("maxWritesPerMinute must be between 1 and 1000.");
  }
  let writeWindowStartedAt = Date.now();
  let writesInWindow = 0;

  const consumeWriteAllowance = (response: Response): boolean => {
    const currentTime = Date.now();
    if (currentTime - writeWindowStartedAt >= 60_000) {
      writeWindowStartedAt = currentTime;
      writesInWindow = 0;
    }
    if (writesInWindow >= maxWritesPerMinute) {
      response.setHeader("Retry-After", "60");
      apiError(response, 429, "rate_limited", "Synthetic run creation is temporarily rate-limited.");
      return false;
    }
    writesInWindow += 1;
    return true;
  };

  router.get("/health", (_request, response) => {
    response.setHeader("Cache-Control", "no-store");
    let persistence: unknown = { state: "not_initialized" };
    let ready = false;
    try {
      if (runStore) {
        persistence = runStore.health();
        ready = true;
      }
    } catch {
      persistence = { state: "unavailable" };
    }
    response.status(ready ? 200 : 503).json({
      status: ready ? "ok" : "degraded",
      service: "bayora",
      mode: "synthetic-only",
      persistence,
      protectedPhoenixData: "blocked",
    });
  });

  router.get("/runs", (request, response) => {
    if (!runStore) return apiError(response, 503, "storage_unavailable", "Synthetic run storage is not initialized.");
    const limit = readListLimit(request);
    if (limit === null) return apiError(response, 400, "invalid_limit", `limit must be an integer from 1 to ${MAX_LIST_LIMIT}.`);
    try {
      const total = runStore.count();
      response.setHeader("Cache-Control", "no-store");
      response.json({
        runs: runStore.list(limit),
        total,
        truncated: total > limit,
        source: "bayora-sqlite-synthetic",
      });
    } catch {
      apiError(response, 500, "storage_error", "Synthetic run records could not be read.");
    }
  });

  router.get("/runs/:runId", (request, response) => {
    if (!runStore) return apiError(response, 503, "storage_unavailable", "Synthetic run storage is not initialized.");
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(request.params.runId ?? "")) {
      return apiError(response, 400, "invalid_run_id", "The run identifier format is invalid.");
    }
    try {
      const run = runStore.get(request.params.runId);
      if (!run) return apiError(response, 404, "not_found", "The synthetic run was not found.");
      response.setHeader("Cache-Control", "no-store");
      response.json({ run, source: "bayora-sqlite-synthetic" });
    } catch {
      apiError(response, 500, "storage_error", "The synthetic run could not be read.");
    }
  });

  router.post("/runs", (request, response) => {
    if (!runStore) return apiError(response, 503, "storage_unavailable", "Synthetic run storage is not initialized.");
    const scenarioId = readScenarioId(request);
    if (!scenarioId) return apiError(response, 400, "invalid_request", "Provide exactly one supported scenarioId; arbitrary inputs and targets are not accepted.");
    if (!consumeWriteAllowance(response)) return;
    try {
      const run = runSyntheticScenario(scenarioId, { runId: createRunId(), now: now(), mode: "synthetic-server" });
      runStore.insertMany([run]);
      response.setHeader("Cache-Control", "no-store");
      response.status(201).json({ run, source: "bayora-sqlite-synthetic" });
    } catch (error) {
      reportRunStorageError(error, response);
    }
  });

  router.post("/runs/suite", (request, response) => {
    if (!runStore) return apiError(response, 503, "storage_unavailable", "Synthetic run storage is not initialized.");
    if (requestHasBody(request)) return apiError(response, 400, "invalid_request", "The fixed suite accepts no request body or caller-supplied inputs.");
    if (!consumeWriteAllowance(response)) return;
    try {
      const runs = runSyntheticSuite(now(), { mode: "synthetic-server", createRunId });
      runStore.insertMany(runs);
      response.setHeader("Cache-Control", "no-store");
      response.status(201).json({ runs, source: "bayora-sqlite-synthetic" });
    } catch (error) {
      reportRunStorageError(error, response);
    }
  });

  router.get("/phoenix/status", async (_request, response) => {
    response.setHeader("Cache-Control", "no-store");
    const checkedAt = now().toISOString();
    const base = phoenixBaseUrl.trim();

    if (!base) {
      const result: PhoenixHealthStatus = {
        state: "not_configured",
        checkedAt: null,
        httpStatus: null,
        message: "PHOENIX_BASE_URL is not set on the server; Phoenix data operations are unavailable.",
        scope: "health-only",
      };
      response.json(result);
      return;
    }

    const healthUrl = normalizePhoenixHealthUrl(base);
    if (!healthUrl) {
      const result: PhoenixHealthStatus = {
        state: "error",
        checkedAt,
        httpStatus: null,
        message: "The server-side Phoenix URL is invalid. Use an HTTP(S) base URL without credentials, query, or fragment.",
        scope: "health-only",
      };
      response.status(503).json(result);
      return;
    }

    try {
      const probe = await fetcher(healthUrl, {
        method: "GET",
        headers: { Accept: "text/plain" },
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(probeTimeoutMs),
      });
      await probe.body?.cancel().catch(() => undefined);
      const result: PhoenixHealthStatus = {
        state: probe.ok ? "healthy" : probe.status === 401 || probe.status === 403 ? "blocked" : "unavailable",
        checkedAt,
        httpStatus: probe.status,
        message: probe.ok
          ? "Phoenix returned a successful health response. This verifies health only, not trace access or security controls."
          : probe.status === 401 || probe.status === 403
            ? "The Phoenix health probe was denied; no protected data was requested."
            : "Phoenix did not return a successful health response.",
        scope: "health-only",
      };
      response.status(probe.ok ? 200 : 502).json(result);
    } catch {
      const result: PhoenixHealthStatus = {
        state: "unavailable",
        checkedAt,
        httpStatus: null,
        message: "Phoenix health could not be reached from the BAYORA server. Check the server URL and service availability.",
        scope: "health-only",
      };
      response.status(502).json(result);
    }
  });

  router.get("/phoenix/data", (_request, response) => {
    apiError(response, 503, "protected_operation_blocked", "Phoenix data operations are unavailable until server-validated identity, authorization, and an authorized Phoenix service are configured.");
  });

  return router;
}
