import type { CreateTestRequest, CreateTestResponse, TestDetailResponse, TestsResponse, RunTestResponse } from "@bayora/shared";
import type { FastifyPluginAsync } from "fastify";
import { bayoraRuntime } from "../runtime.js";

export const testsRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: TestsResponse }>("/tests", async () => ({
    tests: bayoraRuntime.testService.listTests()
  }));

  app.post<{ Body: CreateTestRequest; Reply: CreateTestResponse }>("/tests", async (request, reply) => {
    const created = bayoraRuntime.testService.createTest(request.body);
    return reply.code(201).send(created);
  });

  app.get<{ Params: { id: string }; Reply: TestDetailResponse }>("/tests/:id", async (request, reply) => {
    const test = bayoraRuntime.testService.getTest(request.params.id);

    if (!test) {
      return reply.code(404).send({ test: null as never });
    }

    return { test };
  });

  app.post<{ Params: { id: string }; Reply: RunTestResponse }>("/tests/:id/run", async (request, reply) => {
    const test = bayoraRuntime.testService.getTest(request.params.id);

    if (!test) {
      return reply.code(404).send({ test: null as never, securityEvents: [], auditEntries: [] });
    }

    if (test.status === "running") {
      return reply.code(409).send({ test, securityEvents: [], auditEntries: [] });
    }

    return bayoraRuntime.testService.runTest(test);
  });
};
