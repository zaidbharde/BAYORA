import { useEffect, useState } from "react";
import type { HealthResponse } from "@bayora/shared";
import { apiClient } from "../services/apiClient";

type HealthState =
  | { status: "checking"; data: null; message: "Checking API status" }
  | { status: "online"; data: HealthResponse; message: "API online" }
  | { status: "offline"; data: null; message: string };

export const useSystemHealth = (): HealthState => {
  const [state, setState] = useState<HealthState>({
    status: "checking",
    data: null,
    message: "Checking API status"
  });

  useEffect(() => {
    let isMounted = true;

    const checkHealth = async (): Promise<void> => {
      try {
        const data = await apiClient.getHealth();
        if (isMounted) {
          setState({ status: "online", data, message: "API online" });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "API health check failed";
        if (isMounted) {
          setState({ status: "offline", data: null, message });
        }
      }
    };

    void checkHealth();

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
};

