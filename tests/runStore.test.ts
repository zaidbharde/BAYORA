import assert from "node:assert/strict";
import test from "node:test";
import { runSyntheticScenario } from "../src/shared/scenarios.js";
import { loadRunStore, persistRunStore } from "../src/client/services/runStore.js";

const STORAGE_KEY = "bayora.synthetic-runs.v1";

function withLocalStorage<T>(initial: string | null, callback: (state: { values: Map<string, string>; writes: () => number }) => T): T {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  const values = new Map<string, string>();
  if (initial !== null) values.set(STORAGE_KEY, initial);
  let writes = 0;
  const localStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      writes += 1;
      values.set(key, String(value));
    },
  } as unknown as Storage;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage } as unknown as Window,
  });
  try {
    return callback({ values, writes: () => writes });
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
}

test("valid synthetic run records round-trip through local storage", () => {
  const run = runSyntheticScenario("tool-allowlist-fixture", { runId: "store-test-1", now: new Date("2026-10-26T01:00:00.000Z") });
  withLocalStorage(null, ({ writes }) => {
    const initial = loadRunStore();
    assert.equal(initial.writable, true);
    assert.equal(persistRunStore([run], initial.writable), true);
    const loaded = loadRunStore();
    assert.equal(loaded.runs.length, 1);
    assert.equal(loaded.runs[0]?.id, "store-test-1");
    assert.equal(writes(), 1);
  });
});

test("malformed nested findings are rejected and never overwrite the saved value", () => {
  const run = runSyntheticScenario("tool-allowlist-fixture", { runId: "store-test-2" });
  const malformed = JSON.stringify([{ ...run, findings: [null] }]);
  withLocalStorage(malformed, ({ values, writes }) => {
    const loaded = loadRunStore();
    assert.equal(loaded.runs.length, 0);
    assert.equal(loaded.writable, false);
    assert.match(loaded.notice ?? "", /left untouched/);
    assert.equal(persistRunStore([run], loaded.writable), false);
    assert.equal(values.get(STORAGE_KEY), malformed);
    assert.equal(writes(), 0);
  });
});

test("unknown scenario records are rejected without being rewritten", () => {
  const run = runSyntheticScenario("tool-allowlist-fixture", { runId: "store-test-3" });
  const malformed = JSON.stringify([{ ...run, scenarioId: "unexpected-scenario" }]);
  withLocalStorage(malformed, ({ values, writes }) => {
    const loaded = loadRunStore();
    assert.equal(loaded.writable, false);
    assert.equal(persistRunStore([], loaded.writable), false);
    assert.equal(values.get(STORAGE_KEY), malformed);
    assert.equal(writes(), 0);
  });
});

test("unreadable browser storage keeps new runs in memory only", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } } } as unknown as Window,
  });
  try {
    const loaded = loadRunStore();
    assert.equal(loaded.writable, false);
    assert.match(loaded.notice ?? "", /not overwritten/);
    assert.equal(persistRunStore([], loaded.writable), false);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("browser storage refuses a write above its 5,000-record read limit", () => {
  const run = runSyntheticScenario("tool-allowlist-fixture", { runId: "store-cap-test" });
  const runs = Array.from({ length: 5001 }, (_, index) => ({ ...run, id: `store-cap-${index}` }));
  withLocalStorage(null, ({ values, writes }) => {
    assert.equal(persistRunStore(runs, true), false);
    assert.equal(values.has(STORAGE_KEY), false);
    assert.equal(writes(), 0);
  });
});
