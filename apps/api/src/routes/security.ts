import type { SecurityEventsResponse } from "@bayora/shared";
import type { FastifyPluginAsync } from "fastify";
import { bayoraRuntime } from "../runtime.js";

export const securityRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: SecurityEventsResponse }>("/security/events", async () => ({
    events: bayoraRuntime.securityEventRepository.list().slice().sort((left, right) => right.timestamp.localeCompare(left.timestamp)),
    rules: bayoraRuntime.detectionService.listRules()
  }));

  app.get<{ Reply: SecurityEventsResponse }>("/security/rules", async () => ({
    events: bayoraRuntime.securityEventRepository.list().slice().sort((left, right) => right.timestamp.localeCompare(left.timestamp)),
    rules: bayoraRuntime.detectionService.listRules()
  }));
};
