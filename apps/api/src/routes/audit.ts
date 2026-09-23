import type { AuditLogsResponse } from "@bayora/shared";
import type { FastifyPluginAsync } from "fastify";
import { bayoraRuntime } from "../runtime.js";

export const auditRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: AuditLogsResponse }>("/audit-logs", async () => ({
    logs: bayoraRuntime.auditRepository.list().slice().sort((left, right) => right.timestamp.localeCompare(left.timestamp))
  }));
};
