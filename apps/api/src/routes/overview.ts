import type { OverviewResponse } from "@bayora/shared";
import type { FastifyPluginAsync } from "fastify";
import { bayoraRuntime } from "../runtime.js";

export const overviewRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: OverviewResponse }>("/overview", async () => bayoraRuntime.buildOverview());
};
