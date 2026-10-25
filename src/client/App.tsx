import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import type { PhoenixHealthStatus, SyntheticRun } from "../shared/types.js";
import { runSyntheticScenario, runSyntheticSuite } from "../shared/scenarios.js";
import { loadRunStore, persistRunStore } from "./services/runStore.js";
import { AppShell } from "./components/AppShell.js";
import { OverviewPage } from "./pages/OverviewPage.js";
import { SecurityPage } from "./pages/SecurityPage.js";
import { ObservabilityPage } from "./pages/ObservabilityPage.js";
import { FindingsPage } from "./pages/FindingsPage.js";
import { EvaluationsPage } from "./pages/EvaluationsPage.js";
import { AuditPage } from "./pages/AuditPage.js";
import { EnvironmentPage } from "./pages/EnvironmentPage.js";

const initialStore = loadRunStore();

export function App() {
  const [runs, setRuns] = useState<SyntheticRun[]>(initialStore.runs);
  const [storageNotice, setStorageNotice] = useState<string | null>(initialStore.notice);
  const [storageWritable, setStorageWritable] = useState(initialStore.writable);
  const [phoenix, setPhoenix] = useState<PhoenixHealthStatus | null>(null);
  const [phoenixLoading, setPhoenixLoading] = useState(false);
  const [phoenixError, setPhoenixError] = useState<string | null>(null);

  const refreshPhoenix = useCallback(async () => {
    setPhoenixLoading(true);
    setPhoenixError(null);
    try {
      const response = await fetch("/api/phoenix/status", { cache: "no-store" });
      const result = (await response.json()) as PhoenixHealthStatus;
      setPhoenix(result);
      if (!response.ok && result.state !== "unavailable" && result.state !== "blocked") {
        setPhoenixError("The BAYORA server returned an unexpected health response.");
      }
    } catch {
      setPhoenixError("BAYORA could not retrieve Phoenix health status.");
    } finally {
      setPhoenixLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshPhoenix();
  }, [refreshPhoenix]);

  const appendRuns = useCallback((next: SyntheticRun[]) => {
    const updated = [...next, ...runs];
    setRuns(updated);
    if (!storageWritable) return;
    if (!persistRunStore(updated, true)) {
      setStorageWritable(false);
      setStorageNotice("Browser-local storage could not save the new records. Existing saved data was not overwritten; new runs stay in memory only for this tab.");
    } else {
      setStorageNotice(null);
    }
  }, [runs, storageWritable]);

  const runOne = useCallback((scenarioId: string) => {
    const run = runSyntheticScenario(scenarioId);
    appendRuns([run]);
    return run;
  }, [appendRuns]);

  const runAll = useCallback(() => {
    const completed = runSyntheticSuite();
    appendRuns(completed);
    return completed;
  }, [appendRuns]);

  const runCount = runs.length;
  const passCount = useMemo(() => runs.filter((run) => run.outcome === "PASS").length, [runs]);

  return (
    <AppShell
      runCount={runCount}
      phoenix={phoenix}
      phoenixLoading={phoenixLoading}
      storageNotice={storageNotice}
    >
      <Routes>
        <Route
          path="/"
          element={
            <OverviewPage
              runs={runs}
              passCount={passCount}
              runSuite={runAll}
              storageNotice={storageNotice}
              phoenix={phoenix}
              refreshPhoenix={refreshPhoenix}
              phoenixLoading={phoenixLoading}
              phoenixError={phoenixError}
            />
          }
        />
        <Route path="/security" element={<SecurityPage runs={runs} runOne={runOne} runSuite={runAll} />} />
        <Route path="/observability" element={<ObservabilityPage phoenix={phoenix} loading={phoenixLoading} error={phoenixError} refresh={refreshPhoenix} />} />
        <Route path="/findings" element={<FindingsPage runs={runs} />} />
        <Route path="/evaluations" element={<EvaluationsPage />} />
        <Route path="/audit" element={<AuditPage runs={runs} storageNotice={storageNotice} />} />
        <Route path="/environment" element={<EnvironmentPage phoenix={phoenix} loading={phoenixLoading} error={phoenixError} refresh={refreshPhoenix} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
