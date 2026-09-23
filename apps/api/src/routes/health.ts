import type { HealthResponse } from "@bayora/shared";
import type { FastifyPluginAsync } from "fastify";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: HealthResponse }>("/health", async () => ({
    status: "ok",
    service: "bayora-api"
  }));
};

