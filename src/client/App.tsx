import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import type { PhoenixHealthStatus, SyntheticRun } from "../shared/types.js";
import { loadRunStore } from "./services/runStore.js";
import { executeServerScenario, executeServerSuite, loadServerRuns } from "./services/runApi.js";
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
  const [legacyRuns] = useState<SyntheticRun[]>(initialStore.runs);
  const [storageNotice] = useState<string | null>(initialStore.notice);
  const [serverRuns, setServerRuns] = useState<SyntheticRun[]>([]);
  const [serverRunTotal, setServerRunTotal] = useState(0);
  const [runHistoryTruncated, setRunHistoryTruncated] = useState(false);
  const [runsLoading, setRunsLoading] = useState(true);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [runActionError, setRunActionError] = useState<string | null>(null);
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
      setPhoenixError("BAYORA could not retrieve the upstream health status.");
    } finally {
      setPhoenixLoading(false);
    }
  }, []);

  const refreshRuns = useCallback(async () => {
    setRunsLoading(true);
    setRunsError(null);
    try {
      const result = await loadServerRuns();
      setServerRuns(result.runs);
      setServerRunTotal(result.total);
      setRunHistoryTruncated(result.truncated);
    } catch (error) {
      setRunsError(error instanceof Error ? error.message : "BAYORA synthetic run history is unavailable.");
    } finally {
      setRunsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshPhoenix();
    void refreshRuns();
  }, [refreshPhoenix, refreshRuns]);

  const runOne = useCallback(async (scenarioId: string) => {
    setRunActionError(null);
    try {
      const run = await executeServerScenario(scenarioId);
      setServerRuns((current) => [run, ...current.filter((item) => item.id !== run.id)].slice(0, 500));
      setServerRunTotal((current) => current + 1);
      setRunHistoryTruncated((current) => current || serverRuns.length >= 500);
      setRunsError(null);
      return run;
    } catch (error) {
      const message = error instanceof Error ? error.message : "The BAYORA backend could not execute the synthetic fixture.";
      setRunActionError(message);
      throw error;
    }
  }, [serverRuns.length]);

  const runAll = useCallback(async () => {
    setRunActionError(null);
    try {
      const completed = await executeServerSuite();
      setServerRuns((current) => [...completed, ...current.filter((item) => !completed.some((run) => run.id === item.id))].slice(0, 500));
      setServerRunTotal((current) => current + completed.length);
      setRunHistoryTruncated((current) => current || serverRuns.length + completed.length > 500);
      setRunsError(null);
      return completed;
    } catch (error) {
      const message = error instanceof Error ? error.message : "The BAYORA backend could not execute the synthetic suite.";
      setRunActionError(message);
      throw error;
    }
  }, [serverRuns.length]);

  const runs = useMemo(
    () => [...serverRuns, ...legacyRuns].sort((left, right) => Date.parse(right.completedAt) - Date.parse(left.completedAt)),
    [serverRuns, legacyRuns],
  );
  const passCount = useMemo(() => runs.filter((run) => run.outcome === "PASS").length, [runs]);
  const runCount = serverRunTotal + legacyRuns.length;
  const historyStatus = { loading: runsLoading, error: runsError, total: runCount, truncated: runHistoryTruncated };

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
              runCount={runCount}
              runSuite={() => runAll()}
              storageNotice={storageNotice}
              runsLoading={runsLoading}
              runsError={runsError}
              runActionError={runActionError}
              runHistoryTruncated={runHistoryTruncated}
              refreshRuns={refreshRuns}
              phoenix={phoenix}
              refreshPhoenix={refreshPhoenix}
              phoenixLoading={phoenixLoading}
              phoenixError={phoenixError}
            />
          }
        />
        <Route path="/security" element={<SecurityPage runs={runs} runOne={runOne} runSuite={runAll} runsLoading={runsLoading} runsError={runsError} runActionError={runActionError} runHistoryTruncated={runHistoryTruncated} />} />
        <Route path="/observability" element={<ObservabilityPage phoenix={phoenix} loading={phoenixLoading} error={phoenixError} refresh={refreshPhoenix} />} />
        <Route path="/findings" element={<FindingsPage runs={runs} history={historyStatus} />} />
        <Route path="/evaluations" element={<EvaluationsPage />} />
        <Route path="/audit" element={<AuditPage runs={runs} storageNotice={storageNotice} history={historyStatus} />} />
        <Route path="/environment" element={<EnvironmentPage phoenix={phoenix} loading={phoenixLoading} error={phoenixError} refresh={refreshPhoenix} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
