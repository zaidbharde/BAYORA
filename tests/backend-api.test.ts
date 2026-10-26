import assert from "node:assert/strict";
import test from "node:test";
import type { AddressInfo } from "node:net";
import express from "express";
import { createApiRouter } from "../src/server/api.js";
import { SqliteSyntheticRunStore } from "../src/server/db.js";

async function withBackend(
  callback: (baseUrl: string, store: SqliteSyntheticRunStore) => Promise<void>,
  options: { maxRecords?: number; fetcher?: typeof fetch; maxWritesPerMinute?: number } = {},
): Promise<void> {
  const store = new SqliteSyntheticRunStore(":memory:", options.maxRecords);
  const app = express();
  app.use(express.json({ limit: "16kb", strict: true }));
  app.use((error: unknown, _request: express.Request, response: express.Response, next: express.NextFunction) => {
    const parserError = error as { type?: string };
    if (parserError?.type === "entity.parse.failed") {
      response.status(400).json({ error: "invalid_json", message: "Request body must be valid JSON." });
      return;
    }
    if (parserError?.type === "entity.too.large") {
      response.status(413).json({ error: "request_too_large", message: "Request body exceeds the 16 KiB limit." });
      return;
    }
    next(error);
  });
  app.use("/api", createApiRouter({
    runStore: store,
    phoenixBaseUrl: "https://phoenix.example",
    fetcher: options.fetcher,
    maxWritesPerMinute: options.maxWritesPerMinute,
    now: () => new Date("2026-10-27T00:00:00.000Z"),
    createRunId: (() => { let index = 0; return () => `backend-run-${++index}`; })(),
  }));
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  const address = server.address() as AddressInfo;
  try {
    await callback(`http://127.0.0.1:${address.port}`, store);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    store.close();
  }
}

test("health reports the live SQLite schema and fails no protected Phoenix data claim", async () => {
  await withBackend(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
    assert.equal(body.mode, "synthetic-only");
    assert.deepEqual(body.persistence, { state: "ready", count: 0, maxRecords: 5000, schemaVersion: 1 });
    assert.equal(body.protectedPhoenixData, "blocked");
  });
});

test("HTTP API executes a fixed scenario on the server and persists a retrievable SQLite record", async () => {
  await withBackend(async (baseUrl, store) => {
    const response = await fetch(`${baseUrl}/api/runs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenarioId: "tool-allowlist-fixture" }),
    });
    assert.equal(response.status, 201);
    const created = await response.json();
    assert.equal(created.source, "bayora-sqlite-synthetic");
    assert.equal(created.run.mode, "synthetic-server");
    assert.equal(created.run.outcome, "PASS");
    assert.deepEqual(created.run.evidenceReferences, ["sqlite://bayora/runs/backend-run-1"]);
    assert.equal(created.run.modelConfiguration, "none — deterministic fixture engine");
    assert.equal(store.count(), 1);

    const listResponse = await fetch(`${baseUrl}/api/runs?limit=1`);
    const listed = await listResponse.json();
    assert.equal(listed.total, 1);
    assert.equal(listed.truncated, false);
    assert.equal(listed.runs[0].id, "backend-run-1");

    const getResponse = await fetch(`${baseUrl}/api/runs/backend-run-1`);
    const retrieved = await getResponse.json();
    assert.equal(retrieved.source, "bayora-sqlite-synthetic");
    assert.deepEqual(retrieved.run, created.run);
  });
});

test("run creation rejects arbitrary inputs, target URLs, unknown fields and scenario IDs", async () => {
  await withBackend(async (baseUrl, store) => {
    const cases = [
      { scenarioId: "unregistered-scenario" },
      { scenarioId: "tool-allowlist-fixture", prompt: "caller input" },
      { scenarioId: "tool-allowlist-fixture", targetUrl: "https://example.invalid" },
      { scenarioId: ["tool-allowlist-fixture"] },
      [],
    ];
    for (const body of cases) {
      const response = await fetch(`${baseUrl}/api/runs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error, "invalid_request");
    }
    assert.equal(store.count(), 0);
  });
});

test("malformed or scalar JSON is returned as a bounded JSON 400 response", async () => {
  await withBackend(async (baseUrl, store) => {
    for (const body of ["{not-json", "null"]) {
      const response = await fetch(`${baseUrl}/api/runs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error, "invalid_json");
    }
    assert.equal(store.count(), 0);
  });
});

test("fixed suite persists all three records atomically and refuses request bodies", async () => {
  await withBackend(async (baseUrl, store) => {
    const invalid = await fetch(`${baseUrl}/api/runs/suite`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "caller data" }),
    });
    assert.equal(invalid.status, 400);
    assert.equal(store.count(), 0);

    const nonJsonBody = await fetch(`${baseUrl}/api/runs/suite`, {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "caller data",
    });
    assert.equal(nonJsonBody.status, 400);
    assert.equal((await nonJsonBody.json()).error, "invalid_request");
    assert.equal(store.count(), 0);

    const response = await fetch(`${baseUrl}/api/runs/suite`, { method: "POST" });
    const body = await response.json();
    assert.equal(response.status, 201);
    assert.equal(body.runs.length, 3);
    assert.ok(body.runs.every((run: { mode: string; outcome: string }) => run.mode === "synthetic-server" && run.outcome === "PASS"));
    assert.equal(store.count(), 3);
  });
});

test("suite capacity failure leaves the existing database history unchanged", async () => {
  await withBackend(async (baseUrl, store) => {
    const create = await fetch(`${baseUrl}/api/runs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenarioId: "prompt-injection-fixture" }),
    });
    assert.equal(create.status, 201);
    const response = await fetch(`${baseUrl}/api/runs/suite`, { method: "POST" });
    assert.equal(response.status, 409);
    assert.equal((await response.json()).error, "storage_full");
    assert.equal(store.count(), 1);
  }, { maxRecords: 2 });
});

test("run list query and run identifiers are validated", async () => {
  await withBackend(async (baseUrl) => {
    for (const url of ["/api/runs?limit=0", "/api/runs?limit=501", "/api/runs?limit=1e2", "/api/runs?limit=1&limit=2"]) {
      const response = await fetch(`${baseUrl}${url}`);
      assert.equal(response.status, 400);
    }
    assert.equal((await fetch(`${baseUrl}/api/runs/not%2Fvalid`)).status, 400);
    assert.equal((await fetch(`${baseUrl}/api/runs/missing-run`)).status, 404);
  });
});

test("protected Phoenix data endpoint is fail-closed and makes no upstream request", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls += 1;
    return new Response("unexpected", { status: 200 });
  };
  await withBackend(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/phoenix/data`);
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.error, "protected_operation_blocked");
    assert.match(body.message, /identity, authorization/);
    assert.equal(calls, 0);
  }, { fetcher });
});

test("oversized synthetic API payloads receive a JSON 413 without database writes", async () => {
  await withBackend(async (baseUrl, store) => {
    const response = await fetch(`${baseUrl}/api/runs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenarioId: "x".repeat(17_000) }),
    });
    assert.equal(response.status, 413);
    assert.equal((await response.json()).error, "request_too_large");
    assert.equal(store.count(), 0);
  });
});

test("public synthetic execution is rate-limited before storage exhaustion", async () => {
  await withBackend(async (baseUrl, store) => {
    const request = () => fetch(`${baseUrl}/api/runs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenarioId: "prompt-injection-fixture" }),
    });
    assert.equal((await request()).status, 201);
    const limited = await request();
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get("retry-after"), "60");
    assert.equal((await limited.json()).error, "rate_limited");
    assert.equal(store.count(), 1);
  }, { maxWritesPerMinute: 1 });
});
