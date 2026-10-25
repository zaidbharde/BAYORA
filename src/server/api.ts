import { Router } from "express";
import type { PhoenixHealthStatus } from "../shared/types.js";

interface ApiOptions {
  phoenixBaseUrl?: string;
  fetcher?: typeof fetch;
  probeTimeoutMs?: number;
}

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

export function createApiRouter(options: ApiOptions = {}): Router {
  const router = Router();
  const phoenixBaseUrl = options.phoenixBaseUrl ?? process.env.PHOENIX_BASE_URL ?? "";
  const fetcher = options.fetcher ?? fetch;
  const probeTimeoutMs = options.probeTimeoutMs ?? 3500;

  router.get("/health", (_request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.json({ status: "ok", service: "bayora", mode: "synthetic-only" });
  });

  router.get("/phoenix/status", async (_request, response) => {
    response.setHeader("Cache-Control", "no-store");
    const checkedAt = new Date().toISOString();
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

  return router;
}
