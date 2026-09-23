import type {
  AuditLogsResponse,
  CreateTestRequest,
  CreateTestResponse,
  HealthResponse,
  LlmStatusResponse,
  OverviewResponse,
  RunTestResponse,
  SecurityEventsResponse,
  TestDetailResponse,
  TestsResponse
} from "@bayora/shared";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4000/api";

const request = async <TResponse>(path: string, init?: RequestInit): Promise<TResponse> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {})
    },
    ...init
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return (await response.json()) as TResponse;
};

const post = <TResponse, TBody extends object>(path: string, body: TBody): Promise<TResponse> =>
  request<TResponse>(path, {
    method: "POST",
    body: JSON.stringify(body)
  });

export const apiClient = {
  getHealth: () => request<HealthResponse>("/health"),
  getOverview: () => request<OverviewResponse>("/overview"),
  getTests: () => request<TestsResponse>("/tests"),
  getTest: (testId: string) => request<TestDetailResponse>(`/tests/${testId}`),
  createTest: (payload: CreateTestRequest) => post<CreateTestResponse, CreateTestRequest>("/tests", payload),
  runTest: (testId: string) => post<RunTestResponse, Record<string, never>>(`/tests/${testId}/run`, {}),
  getSecurityEvents: () => request<SecurityEventsResponse>("/security/events"),
  getAuditLogs: () => request<AuditLogsResponse>("/audit-logs"),
  getLlmStatus: () => request<LlmStatusResponse>("/llm/status")
};

