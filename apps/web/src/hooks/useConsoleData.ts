import { useEffect, useState } from "react";
import type {
  AuditLogEntry,
  CreateTestRequest,
  LlmStatusResponse,
  OverviewResponse,
  SecurityEvent,
  DetectionRule,
  TestRun,
  TestRunSummary
} from "@bayora/shared";
import { apiClient } from "../services/apiClient";

interface ConsoleState {
  overview: OverviewResponse | null;
  tests: TestRunSummary[];
  selectedTest: TestRun | null;
  securityEvents: SecurityEvent[];
  securityRules: DetectionRule[];
  auditLogs: AuditLogEntry[];
  llmStatus: LlmStatusResponse | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

const emptyState: ConsoleState = {
  overview: null,
  tests: [],
  selectedTest: null,
  securityEvents: [],
  securityRules: [],
  auditLogs: [],
  llmStatus: null,
  loading: true,
  refreshing: false,
  error: null
};

export const useConsoleData = () => {
  const [state, setState] = useState<ConsoleState>(emptyState);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);

  const loadAll = async (
    refreshing: boolean,
    selectedId: string | null = selectedTestId,
    fallbackSelectedTest: TestRun | null = state.selectedTest
  ): Promise<void> => {
    setState((current) => ({ ...current, loading: current.loading && !refreshing, refreshing, error: null }));

    try {
      const [overview, testsResponse, securityResponse, auditResponse, llmResponse] = await Promise.all([
        apiClient.getOverview(),
        apiClient.getTests(),
        apiClient.getSecurityEvents(),
        apiClient.getAuditLogs(),
        apiClient.getLlmStatus()
      ]);

      let selectedTest: TestRun | null = fallbackSelectedTest;
      if (selectedId) {
        try {
          selectedTest = (await apiClient.getTest(selectedId)).test;
        } catch {
          selectedTest = null;
        }
      }

      setState({
        overview,
        tests: testsResponse.tests,
        selectedTest: selectedTest ?? null,
        securityEvents: securityResponse.events,
        securityRules: securityResponse.rules,
        auditLogs: auditResponse.logs,
        llmStatus: llmResponse,
        loading: false,
        refreshing: false,
        error: null
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        refreshing: false,
        error: error instanceof Error ? error.message : "Failed to load console data"
      }));
    }
  };

  useEffect(() => {
    void loadAll(false);
  }, []);

  useEffect(() => {
    if (!selectedTestId) {
      return;
    }

    void (async () => {
      try {
        const response = await apiClient.getTest(selectedTestId);
        setState((current) => ({ ...current, selectedTest: response.test }));
      } catch {
        setState((current) => ({ ...current, selectedTest: null }));
      }
    })();
  }, [selectedTestId]);

  const refresh = async (): Promise<void> => {
    await loadAll(true);
  };

  const createTest = async (payload: CreateTestRequest): Promise<TestRun> => {
    const response = await apiClient.createTest(payload);
    setSelectedTestId(response.test.id);
    setState((current) => ({ ...current, selectedTest: response.test }));
    await loadAll(true, response.test.id, response.test);
    return response.test;
  };

  const runTest = async (testId: string): Promise<TestRun | null> => {
    const response = await apiClient.runTest(testId);
    setSelectedTestId(testId);
    setState((current) => ({ ...current, selectedTest: response.test }));
    await loadAll(true, testId, response.test);
    return response.test;
  };

  return {
    ...state,
    selectedTestId,
    setSelectedTestId,
    refresh,
    createTest,
    runTest
  };
};
