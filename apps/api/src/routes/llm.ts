import type { LlmStatusResponse } from "@bayora/shared";
import type { FastifyPluginAsync } from "fastify";
import { bayoraRuntime } from "../runtime.js";

export const llmRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: LlmStatusResponse }>("/llm/status", async () =>
    bayoraRuntime.llmService.getStatus(bayoraRuntime.testRepository.listSummaries().slice(0, 5))
  );
};
