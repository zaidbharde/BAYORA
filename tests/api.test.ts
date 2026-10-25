import assert from "node:assert/strict";
import test from "node:test";
import type { AddressInfo } from "node:net";
import express from "express";
import { createApiRouter, normalizePhoenixHealthUrl } from "../src/server/api.js";

async function withApi(
  options: Parameters<typeof createApiRouter>[0],
  callback: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const app = express();
  app.use("/api", createApiRouter(options));
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  const address = server.address() as AddressInfo;
  try {
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("BAYORA health returns only the prototype's truthful service mode", async () => {
  await withApi({ phoenixBaseUrl: "" }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok", service: "bayora", mode: "synthetic-only" });
  });
});

test("unset Phoenix URL does not make a network request or imply a connected service", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls += 1;
    return new Response("unexpected", { status: 200 });
  };
  await withApi({ phoenixBaseUrl: "", fetcher }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/phoenix/status`);
    const result = await response.json();
    assert.equal(result.state, "not_configured");
    assert.equal(result.scope, "health-only");
    assert.equal(calls, 0);
  });
});

test("Phoenix probe uses only /healthz and reports the observed successful HTTP status", async () => {
  let requestedUrl = "";
  let requestOptions: RequestInit | undefined;
  const fetcher: typeof fetch = async (input, init) => {
    requestedUrl = String(input);
    requestOptions = init;
    return new Response("OK", { status: 200 });
  };
  await withApi({ phoenixBaseUrl: "http://phoenix.test/internal/", fetcher }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/phoenix/status`);
    const result = await response.json();
    assert.equal(response.status, 200);
    assert.equal(new URL(requestedUrl).pathname, "/internal/healthz");
    assert.equal(result.state, "healthy");
    assert.equal(result.httpStatus, 200);
    assert.equal(result.scope, "health-only");
    assert.equal(requestOptions?.redirect, "manual");
    assert.equal(requestOptions?.cache, "no-store");
    assert.ok(requestOptions?.signal instanceof AbortSignal);
  });
});

test("Phoenix health redirects are not followed", async () => {
  let calls = 0;
  let redirectMode: RequestRedirect | undefined;
  const fetcher: typeof fetch = async (_input, init) => {
    calls += 1;
    redirectMode = init?.redirect;
    return new Response(null, { status: 302, headers: { location: "https://other-host.example/healthz" } });
  };
  await withApi({ phoenixBaseUrl: "https://phoenix.example", fetcher }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/phoenix/status`);
    const result = await response.json();
    assert.equal(response.status, 502);
    assert.equal(result.state, "unavailable");
    assert.equal(redirectMode, "manual");
    assert.equal(calls, 1);
  });
});

test("Phoenix health timeout aborts the configured request", async () => {
  let observedAbort = false;
  const fetcher: typeof fetch = async (_input, init) => {
    const signal = init?.signal;
    assert.ok(signal);
    return await new Promise<Response>((_resolve, reject) => {
      signal.addEventListener("abort", () => {
        observedAbort = true;
        reject(signal.reason);
      }, { once: true });
      if (signal.aborted) {
        observedAbort = true;
        reject(signal.reason);
      }
    });
  };
  await withApi({ phoenixBaseUrl: "https://phoenix.example", fetcher, probeTimeoutMs: 5 }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/phoenix/status`);
    const result = await response.json();
    assert.equal(response.status, 502);
    assert.equal(result.state, "unavailable");
    assert.equal(observedAbort, true);
  });
});

test("invalid server-side Phoenix URL is a settled configuration error", async () => {
  const fetcher: typeof fetch = async () => new Response("unexpected", { status: 200 });
  await withApi({ phoenixBaseUrl: "https://user:secret@phoenix.example", fetcher }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/phoenix/status`);
    const result = await response.json();
    assert.equal(response.status, 503);
    assert.equal(result.state, "error");
    assert.match(result.message, /invalid/);
  });
});

test("Phoenix access-denied probe remains blocked and no protected route is requested", async () => {
  let requestedPath = "";
  const fetcher: typeof fetch = async (input) => {
    requestedPath = new URL(String(input)).pathname;
    return new Response("denied", { status: 401 });
  };
  await withApi({ phoenixBaseUrl: "https://phoenix.example", fetcher }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/phoenix/status`);
    const result = await response.json();
    assert.equal(response.status, 502);
    assert.equal(result.state, "blocked");
    assert.equal(requestedPath, "/healthz");
  });
});

test("Phoenix URL validation rejects credentials, query, fragment and non-HTTP schemes", () => {
  assert.equal(normalizePhoenixHealthUrl("https://user:secret@phoenix.example"), null);
  assert.equal(normalizePhoenixHealthUrl("https://phoenix.example?token=secret"), null);
  assert.equal(normalizePhoenixHealthUrl("https://phoenix.example#private"), null);
  assert.equal(normalizePhoenixHealthUrl("ftp://phoenix.example"), null);
  assert.equal(normalizePhoenixHealthUrl("http://phoenix.example")?.pathname, "/healthz");
});

test("network exceptions return a sanitized generic response", async () => {
  const fetcher: typeof fetch = async () => {
    throw new Error("internal-hostname credential-value");
  };
  await withApi({ phoenixBaseUrl: "https://phoenix.example", fetcher }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/phoenix/status`);
    const result = await response.json();
    assert.equal(result.state, "unavailable");
    assert.equal(JSON.stringify(result).includes("credential-value"), false);
    assert.equal(JSON.stringify(result).includes("internal-hostname"), false);
  });
});
