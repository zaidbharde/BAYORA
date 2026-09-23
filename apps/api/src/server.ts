import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import type { FastifyError } from "fastify";
import { getApiConfig } from "./config/env.js";
import { healthRoutes } from "./routes/health.js";

export const buildServer = async (): Promise<FastifyInstance> => {
  const config = getApiConfig();
  const app = Fastify({
    logger: {
      level: config.nodeEnv === "test" ? "silent" : "info"
    }
  });

  await app.register(cors, {
    origin: config.corsOrigin
  });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ error }, "Unhandled API error");

    const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
    void reply.status(statusCode).send({
      error: statusCode === 500 ? "Internal Server Error" : error.message,
      statusCode
    });
  });

  app.register(
    async (api) => {
      await api.register(healthRoutes);
    },
    { prefix: "/api" }
  );

  return app;
};

const start = async (): Promise<void> => {
  const config = getApiConfig();
  const app = await buildServer();

  try {
    await app.listen({ host: config.host, port: config.port });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== "test") {
  void start();
}
