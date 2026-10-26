import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const temporary = mkdtempSync(path.join(tmpdir(), "bayora-production-"));
const port = 17321 + Math.floor(Math.random() * 1000);
const database = path.join(temporary, "smoke.sqlite");
const server = spawn("node", ["dist/server/server/index.js"], {
  cwd: root,
  env: { ...process.env, NODE_ENV: "production", PORT: String(port), BAYORA_DATABASE_PATH: database, PHOENIX_BASE_URL: "" },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
server.stdout.on("data", (chunk) => { output += chunk.toString(); });
server.stderr.on("data", (chunk) => { output += chunk.toString(); });

async function ready() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Production server exited early: ${output}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(500) });
      if (!response.ok) throw new Error(`Unexpected health status ${response.status}`);
      const health = await response.json();
      if (health.persistence?.state !== "ready" || health.persistence.schemaVersion !== 1) throw new Error("SQLite health did not report ready schema v1.");
      return;
    } catch (error) {
      if (attempt === 39) throw new Error(`Production server readiness failed: ${String(error)}\n${output}`, { cause: error });
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}

try {
  await ready();
  const rootResponse = await fetch(`http://127.0.0.1:${port}/`);
  if (!rootResponse.ok || !(await rootResponse.text()).includes("BAYORA")) throw new Error("Production client HTML did not load.");
  const create = await fetch(`http://127.0.0.1:${port}/api/runs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenarioId: "output-canary-fixture" }),
  });
  if (create.status !== 201) throw new Error(`Production run creation returned ${create.status}.`);
  const created = await create.json();
  if (created.run.mode !== "synthetic-server" || created.source !== "bayora-sqlite-synthetic") throw new Error("Production run provenance was incorrect.");
  console.log(`PASS production start, client, health/schema, and server run creation on isolated port ${port}.`);
} finally {
  if (server.exitCode === null) {
    server.kill("SIGTERM");
    await new Promise((resolve) => server.once("exit", resolve));
  }
  rmSync(temporary, { recursive: true, force: true });
}
