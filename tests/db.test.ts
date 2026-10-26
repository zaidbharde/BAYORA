import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { runSyntheticScenario } from "../src/shared/scenarios.js";
import { SqliteSyntheticRunStore, SyntheticRunStoreFullError } from "../src/server/db.js";

function serverRun(id: string, scenarioId = "tool-allowlist-fixture") {
  return runSyntheticScenario(scenarioId, {
    runId: id,
    now: new Date("2026-10-27T00:00:00.000Z"),
    mode: "synthetic-server",
  });
}

test("SQLite migration persists generated run records across a database reopen", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "bayora-db-"));
  const databasePath = path.join(directory, "bayora.sqlite");
  try {
    const first = new SqliteSyntheticRunStore(databasePath);
    assert.deepEqual(first.health(), { state: "ready", count: 0, maxRecords: 5000, schemaVersion: 1 });
    const run = serverRun("db-restart-1");
    first.insertMany([run]);
    assert.equal(first.count(), 1);
    first.close();

    const reopened = new SqliteSyntheticRunStore(databasePath);
    assert.equal(reopened.health().schemaVersion, 1);
    assert.deepEqual(reopened.get(run.id), run);
    assert.equal(reopened.list(10)[0]?.id, run.id);
    reopened.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("SQLite capacity rejects overflow without deleting existing history", () => {
  const store = new SqliteSyntheticRunStore(":memory:", 2);
  try {
    const accepted = [serverRun("capacity-1"), serverRun("capacity-2", "prompt-injection-fixture")];
    store.insertMany(accepted);
    assert.throws(() => store.insertMany([serverRun("capacity-3", "output-canary-fixture")]), SyntheticRunStoreFullError);
    assert.equal(store.count(), 2);
    assert.deepEqual(store.list(10).map((run) => run.id), ["capacity-2", "capacity-1"]);
  } finally {
    store.close();
  }
});

test("SQLite batches roll back atomically and reject browser-local records", () => {
  const store = new SqliteSyntheticRunStore(":memory:");
  try {
    const duplicate = serverRun("duplicate-id");
    assert.throws(() => store.insertMany([duplicate, duplicate]));
    assert.equal(store.count(), 0);
    assert.throws(() => store.insertMany([runSyntheticScenario("tool-allowlist-fixture", { runId: "browser-local" })]), /Only server-executed synthetic runs/);
    assert.equal(store.count(), 0);
  } finally {
    store.close();
  }
});
