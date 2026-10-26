import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { runSyntheticScenario } from "../src/shared/scenarios.js";
import type { SyntheticRun } from "../src/shared/types.js";
import { AuditPage } from "../src/client/pages/AuditPage.js";
import { FindingsPage } from "../src/client/pages/FindingsPage.js";

type HistoryStatus = { loading: boolean; error: string | null; total: number; truncated: boolean };
const emptyHistory: HistoryStatus = { loading: false, error: null, total: 0, truncated: false };
const noRuns: SyntheticRun[] = [];
const sampleRun = runSyntheticScenario("prompt-injection-fixture", {
  runId: "render-test-run",
  now: new Date("2026-10-27T00:00:00.000Z"),
  mode: "synthetic-server",
});

function audit(history: HistoryStatus, runs = noRuns): string {
  return renderToStaticMarkup(createElement(AuditPage, { runs, storageNotice: null, history }));
}

function findings(history: HistoryStatus, runs = noRuns): string {
  return renderToStaticMarkup(createElement(FindingsPage, { runs, history }));
}

test("Audit reports loading instead of an empty result", () => {
  const html = audit({ ...emptyHistory, loading: true });
  assert.match(html, /role="status"/);
  assert.match(html, /Loading run history/);
  assert.doesNotMatch(html, /No records loaded/);
});

test("Audit reports a run-history error and does not claim the history is empty", () => {
  const html = audit({ ...emptyHistory, error: "History load error" });
  assert.match(html, /role="alert"/);
  assert.match(html, /History load error/);
  assert.match(html, /empty history cannot be confirmed/);
  assert.match(html, /UNAVAILABLE/);
  assert.doesNotMatch(html, />No records loaded</);
});

test("Audit reports truncated totals and does not call an empty loaded page an empty store", () => {
  const html = audit({ loading: false, error: null, total: 805, truncated: true });
  assert.match(html, /TOTAL RUN RECORDS/);
  assert.match(html, />805</);
  assert.match(html, /role="status"/);
  assert.match(html, /older server records are omitted/);
  assert.match(html, /History page incomplete/);
  assert.match(html, /do not interpret this as an empty store/);
  assert.doesNotMatch(html, />No records loaded</);
});

test("Findings shows loading, not a no-findings assertion, while history is pending", () => {
  const html = findings({ ...emptyHistory, loading: true });
  assert.match(html, /Loading run history/);
  assert.doesNotMatch(html, /There are no fixture mismatches/);
});

test("Findings reports a history error without claiming there are no regressions", () => {
  const html = findings({ ...emptyHistory, error: "History load error" });
  assert.match(html, /role="alert"/);
  assert.match(html, /History load error/);
  assert.match(html, /complete empty finding set cannot be confirmed/);
  assert.doesNotMatch(html, /There are no fixture mismatches/);
});

test("Findings warns that a zero-record truncated page is indeterminate", () => {
  const html = findings({ loading: false, error: null, total: 805, truncated: true });
  assert.match(html, /History page incomplete/);
  assert.match(html, /findings cannot be determined/);
  assert.match(html, /805 total run records/);
  assert.doesNotMatch(html, /No harness regressions recorded/);
});

test("Findings confines a no-regressions result to loaded runs when history is truncated", () => {
  const html = findings({ loading: false, error: null, total: 805, truncated: true }, [sampleRun]);
  assert.match(html, /No findings in the loaded records/);
  assert.match(html, /Finding counts cover only the loaded run page/);
  assert.match(html, /805 total run records/);
  assert.match(html, /may contain additional findings/);
  assert.doesNotMatch(html, /There are no fixture mismatches in the available/);
});

test("Audit and Findings show proper empty states after a complete successful empty load", () => {
  const auditHtml = audit(emptyHistory);
  const findingsHtml = findings(emptyHistory);
  assert.match(auditHtml, /No records loaded/);
  assert.match(findingsHtml, /No harness regressions recorded/);
  assert.match(findingsHtml, /There are no fixture mismatches in the available/);
});
