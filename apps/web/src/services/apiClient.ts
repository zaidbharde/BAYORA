import type { HealthResponse } from "@bayora/shared";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4000/api";

const request = async <TResponse>(path: string): Promise<TResponse> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return (await response.json()) as TResponse;
};

export const apiClient = {
  getHealth: () => request<HealthResponse>("/health")
};

